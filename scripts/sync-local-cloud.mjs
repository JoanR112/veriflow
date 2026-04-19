import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { list } from "@vercel/blob";

const localCloudDir =
  process.env.LOCAL_CLOUD_DIR ?? path.join(process.cwd(), "local-cloud", "verifications");
const dataFile = path.join(process.cwd(), "data", "verifications.json");

async function readLocalRecords() {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.verifications ?? [];
  } catch {
    return [];
  }
}

async function listBlobManifestRecords() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return [];
  }

  const { blobs } = await list({
    prefix: "verifications/",
    limit: 1000,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const manifestBlobs = blobs.filter((blob) => blob.pathname.endsWith("/manifest.json"));

  return Promise.all(
    manifestBlobs.map(async (blob) => {
      const response = await fetch(blob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Blob manifest fetch failed with ${response.status}`);
      }

      return response.json();
    }),
  );
}

async function listSupabaseRecords() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  if (!supabaseUrl || !serviceRole) {
    return [];
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/verifications?select=*`, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed with ${response.status}`);
  }

  return response.json();
}

async function writeLocalSyncStamp(records) {
  try {
    const existing = JSON.parse(await fs.readFile(dataFile, "utf8"));
    existing.verifications = existing.verifications.map((record) => {
      const updated = records.find((item) => item.id === record.id);
      return updated ?? record;
    });
    await fs.writeFile(dataFile, JSON.stringify(existing, null, 2));
  } catch {
    // Local fallback store is optional when Supabase is active.
  }
}

async function updateSupabaseSyncStamp(recordId, syncedAt) {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  if (!supabaseUrl || !serviceRole) {
    return;
  }

  await fetch(`${supabaseUrl}/rest/v1/verifications?id=eq.${recordId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ local_synced_at: syncedAt }),
  });
}

async function downloadPrivateBlob(url) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to sync private blobs locally.");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Blob download failed with ${response.status} for ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function syncRecord(record) {
  const recordDir = path.join(localCloudDir, record.username, record.id);
  await fs.mkdir(recordDir, { recursive: true });

  const selfieBytes = await downloadPrivateBlob(record.selfie_blob_url ?? record.selfieBlobUrl);
  const idFrontBytes = await downloadPrivateBlob(
    record.id_front_blob_url ?? record.idFrontBlobUrl,
  );
  const idBackBytes = await downloadPrivateBlob(
    record.id_back_blob_url ?? record.idBackBlobUrl,
  );
  const selfieExtension = path.extname(record.selfie_blob_path ?? record.selfieBlobPath) || ".jpg";
  const idFrontExtension =
    path.extname(record.id_front_blob_path ?? record.idFrontBlobPath) || ".jpg";
  const idBackExtension =
    path.extname(record.id_back_blob_path ?? record.idBackBlobPath) || ".jpg";

  await fs.writeFile(path.join(recordDir, `selfie${selfieExtension}`), selfieBytes);
  await fs.writeFile(path.join(recordDir, `id-front${idFrontExtension}`), idFrontBytes);
  await fs.writeFile(path.join(recordDir, `id-back${idBackExtension}`), idBackBytes);

  const manifest = {
    id: record.id,
    username: record.username,
    amount: record.amount,
    status: record.status,
    matchScore: record.matchScore ?? record.match_score,
    syncedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(recordDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  return manifest.syncedAt;
}

async function main() {
  const [supabaseRecords, blobRecords, localRecords] = await Promise.all([
    listSupabaseRecords(),
    listBlobManifestRecords(),
    readLocalRecords(),
  ]);

  const baseRecords = supabaseRecords.length
    ? supabaseRecords
    : blobRecords.length
      ? blobRecords
      : localRecords;

  const records = baseRecords.filter(
    (record) => !(record.local_synced_at ?? record.localSyncedAt),
  );

  if (!records.length) {
    console.log("No new verification records to sync.");
    return;
  }

  const updatedRecords = [];

  for (const record of records) {
    const syncedAt = await syncRecord(record);
    updatedRecords.push({
      ...record,
      localSyncedAt: syncedAt,
    });
    await updateSupabaseSyncStamp(record.id, syncedAt);
    console.log(`Synced ${record.id} to ${path.join(localCloudDir, record.username, record.id)}`);
  }

  if (!supabaseRecords.length && !blobRecords.length) {
    await writeLocalSyncStamp(updatedRecords);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
