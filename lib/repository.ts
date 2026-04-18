import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
  selfie_blob_url: string;
  selfie_blob_path: string;
  id_blob_url: string;
  id_blob_path: string;
  selfie_supabase_path: string | null;
  id_supabase_path: string | null;
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
    selfie_blob_url: record.selfieBlobUrl,
    selfie_blob_path: record.selfieBlobPath,
    id_blob_url: record.idBlobUrl,
    id_blob_path: record.idBlobPath,
    selfie_supabase_path: record.selfieSupabasePath,
    id_supabase_path: record.idSupabasePath,
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
    selfieBlobUrl: record.selfie_blob_url,
    selfieBlobPath: record.selfie_blob_path,
    idBlobUrl: record.id_blob_url,
    idBlobPath: record.id_blob_path,
    selfieSupabasePath: record.selfie_supabase_path,
    idSupabasePath: record.id_supabase_path,
    extractedIdentity: record.extracted_identity,
    localSyncedAt: record.local_synced_at,
  };
}

async function ensureLocalStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(localStoreFile, "utf8");
  } catch {
    const emptyStore: LocalStoreShape = { verifications: [] };
    await writeFile(localStoreFile, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

async function readLocalStore() {
  await ensureLocalStore();
  const raw = await readFile(localStoreFile, "utf8");
  return JSON.parse(raw) as LocalStoreShape;
}

async function writeLocalStore(data: LocalStoreShape) {
  await ensureLocalStore();
  await writeFile(localStoreFile, JSON.stringify(data, null, 2), "utf8");
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

  const store = await readLocalStore();
  return store.verifications;
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

  const store = await readLocalStore();
  store.verifications = store.verifications.map((record) =>
    record.id === verificationId ? { ...record, localSyncedAt: syncedAt } : record,
  );
  await writeLocalStore(store);
}
