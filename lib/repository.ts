import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { list, put } from "@vercel/blob";

import type { VerificationRecord } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase";

const dataDir = path.join(process.cwd(), "data");
const localStoreFile = path.join(dataDir, "verifications.json");

type LocalStoreShape = {
  verifications: VerificationRecord[];
};

type VerificationDbRecord = {
  id: string;
  username: string;
  amount: number;
  request_url: string;
  created_at: string;
  status: VerificationRecord["status"];
  match_score: number;
  summary: string;
  reasons: string[];
  id_readable: boolean;
  face_matches: boolean;
  contact: VerificationRecord["contact"];
  consents: VerificationRecord["consents"];
  selfie_blob_url: string;
  selfie_blob_path: string;
  id_front_blob_url: string;
  id_front_blob_path: string;
  id_back_blob_url: string;
  id_back_blob_path: string;
  selfie_supabase_path: string | null;
  id_front_supabase_path: string | null;
  id_back_supabase_path: string | null;
  extracted_identity: VerificationRecord["extractedIdentity"];
  local_synced_at: string | null;
};

function toDbRecord(record: VerificationRecord): VerificationDbRecord {
  return {
    id: record.id,
    username: record.username,
    amount: record.amount,
    request_url: record.requestUrl,
    created_at: record.createdAt,
    status: record.status,
    match_score: record.matchScore,
    summary: record.summary,
    reasons: record.reasons,
    id_readable: record.idReadable,
    face_matches: record.faceMatches,
    contact: record.contact,
    consents: record.consents,
    selfie_blob_url: record.selfieBlobUrl,
    selfie_blob_path: record.selfieBlobPath,
    id_front_blob_url: record.idFrontBlobUrl,
    id_front_blob_path: record.idFrontBlobPath,
    id_back_blob_url: record.idBackBlobUrl,
    id_back_blob_path: record.idBackBlobPath,
    selfie_supabase_path: record.selfieSupabasePath,
    id_front_supabase_path: record.idFrontSupabasePath,
    id_back_supabase_path: record.idBackSupabasePath,
    extracted_identity: record.extractedIdentity,
    local_synced_at: record.localSyncedAt,
  };
}

function fromDbRecord(record: VerificationDbRecord): VerificationRecord {
  return {
    id: record.id,
    username: record.username,
    amount: record.amount,
    requestUrl: record.request_url,
    createdAt: record.created_at,
    status: record.status,
    matchScore: record.match_score,
    summary: record.summary,
    reasons: record.reasons,
    idReadable: record.id_readable,
    faceMatches: record.face_matches,
    contact: record.contact,
    consents: record.consents,
    selfieBlobUrl: record.selfie_blob_url,
    selfieBlobPath: record.selfie_blob_path,
    idFrontBlobUrl: record.id_front_blob_url,
    idFrontBlobPath: record.id_front_blob_path,
    idBackBlobUrl: record.id_back_blob_url,
    idBackBlobPath: record.id_back_blob_path,
    selfieSupabasePath: record.selfie_supabase_path,
    idFrontSupabasePath: record.id_front_supabase_path,
    idBackSupabasePath: record.id_back_supabase_path,
    extractedIdentity: record.extracted_identity,
    localSyncedAt: record.local_synced_at,
  };
}

async function ensureLocalStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(localStoreFile, "utf8");
  } catch {
    await writeFile(
      localStoreFile,
      JSON.stringify({ verifications: [] satisfies VerificationRecord[] }, null, 2),
      "utf8",
    );
  }
}

async function readLocalStore() {
  await ensureLocalStore();
  return JSON.parse(await readFile(localStoreFile, "utf8")) as LocalStoreShape;
}

async function writeLocalStore(data: LocalStoreShape) {
  await ensureLocalStore();
  await writeFile(localStoreFile, JSON.stringify(data, null, 2), "utf8");
}

function buildManifestPath(recordId: string) {
  return `verifications/${recordId}/manifest.json`;
}

async function saveBlobManifest(record: VerificationRecord) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return false;
  }

  await put(buildManifestPath(record.id), JSON.stringify(record, null, 2), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  return true;
}

async function listBlobManifestRecords() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return [] as VerificationRecord[];
  }

  const { blobs } = await list({
    prefix: "verifications/",
    limit: 1000,
  });

  const records = await Promise.all(
    blobs
      .filter((blob) => blob.pathname.endsWith("/manifest.json"))
      .map(async (blob) => {
        const response = await fetch(blob.url, {
          headers: {
            Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Blob manifest fetch failed: ${response.status}`);
        }

        return (await response.json()) as VerificationRecord;
      }),
  );

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveVerificationRecord(record: VerificationRecord) {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from("verifications").upsert(toDbRecord(record));

    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    return;
  }

  if (await saveBlobManifest(record)) {
    return;
  }

  const store = await readLocalStore();
  store.verifications = [
    record,
    ...store.verifications.filter((item) => item.id !== record.id),
  ];
  await writeLocalStore(store);
}

export async function listVerificationRecords() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("verifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return (data as VerificationDbRecord[]).map(fromDbRecord);
  }

  if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
    return listBlobManifestRecords();
  }

  return (await readLocalStore()).verifications;
}

export async function markVerificationLocalSynced(
  verificationId: string,
  syncedAt: string,
) {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase
      .from("verifications")
      .update({ local_synced_at: syncedAt })
      .eq("id", verificationId);

    if (error) {
      throw new Error(`Supabase sync update failed: ${error.message}`);
    }

    return;
  }

  if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
    const records = await listBlobManifestRecords();
    const target = records.find((record) => record.id === verificationId);

    if (target) {
      await saveBlobManifest({ ...target, localSyncedAt: syncedAt });
    }

    return;
  }

  const store = await readLocalStore();
  store.verifications = store.verifications.map((record) =>
    record.id === verificationId ? { ...record, localSyncedAt: syncedAt } : record,
  );
  await writeLocalStore(store);
}
