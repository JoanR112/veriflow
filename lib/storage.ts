import "server-only";

import { put } from "@vercel/blob";

import { slugify } from "@/lib/format";
import { getSupabaseAdmin, supabaseBucket } from "@/lib/supabase";

export type StoredUpload = {
  url: string;
  pathname: string;
  downloadUrl: string;
  supabasePath: string | null;
};

function buildPath(
  verificationId: string,
  slot: "selfie" | "id_front" | "id_back",
  file: File,
) {
  const baseName = file.name ? slugify(file.name) : `${slot}-upload`;
  const extension = baseName.includes(".")
    ? ""
    : file.type.includes("png")
      ? ".png"
      : file.type.includes("webp")
        ? ".webp"
        : ".jpg";

  return `verifications/${verificationId}/${slot}-${baseName}${extension}`;
}

export async function storeSensitiveUpload(input: {
  verificationId: string;
  slot: "selfie" | "id_front" | "id_back";
  file: File;
}): Promise<StoredUpload> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
  }

  const pathname = buildPath(input.verificationId, input.slot, input.file);
  const blob = await put(pathname, input.file, {
    access: "private",
    addRandomSuffix: false,
    contentType: input.file.type || "image/jpeg",
  });

  const supabasePath = await mirrorToSupabase(input.file, pathname);

  return {
    url: blob.url,
    pathname: blob.pathname,
    downloadUrl: blob.downloadUrl,
    supabasePath,
  };
}

async function mirrorToSupabase(file: File, pathname: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(supabaseBucket)
    .upload(pathname, fileBuffer, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    throw new Error(`Supabase mirror failed: ${error.message}`);
  }

  return pathname;
}
