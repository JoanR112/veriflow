import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppConfigStatus } from "@/lib/config";
import { verifyIdentityPair } from "@/lib/openai";
import { saveVerificationRecord } from "@/lib/repository";
import { storeSensitiveUpload } from "@/lib/storage";
import type { VerificationRecord } from "@/lib/types";

export const runtime = "nodejs";

const payloadSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  amount: z.coerce.number().int().positive(),
  requestUrl: z.string().url(),
});

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!(value instanceof File)) {
    throw new Error(`Missing file: ${key}`);
  }

  return value;
}

export async function POST(request: Request) {
  const config = getAppConfigStatus();

  if (!config.requiredReady) {
    return NextResponse.json(
      {
        error:
          "Verification is not configured yet. Add OPENAI_API_KEY and BLOB_READ_WRITE_TOKEN first.",
        missing: config.requiredMissing,
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const parsed = payloadSchema.parse({
      username: formData.get("username"),
      amount: formData.get("amount"),
      requestUrl: formData.get("requestUrl"),
    });

    const selfie = getFile(formData, "selfie");
    const idPhoto = getFile(formData, "idPhoto");

    const verificationId = randomUUID();
    const [selfieUpload, idUpload] = await Promise.all([
      storeSensitiveUpload({
        verificationId,
        slot: "selfie",
        file: selfie,
      }),
      storeSensitiveUpload({
        verificationId,
        slot: "id",
        file: idPhoto,
      }),
    ]);

    const analysis = await verifyIdentityPair({
      username: parsed.username,
      amount: parsed.amount,
      selfie,
      idPhoto,
    });

    const record: VerificationRecord = {
      id: verificationId,
      username: parsed.username,
      amount: parsed.amount,
      requestUrl: parsed.requestUrl,
      createdAt: new Date().toISOString(),
      status: analysis.decision,
      matchScore: analysis.matchScore,
      summary: analysis.summary,
      reasons: analysis.reasons,
      idReadable: analysis.idReadable,
      faceMatches: analysis.faceMatches,
      selfieBlobUrl: selfieUpload.url,
      selfieBlobPath: selfieUpload.pathname,
      idBlobUrl: idUpload.url,
      idBlobPath: idUpload.pathname,
      selfieSupabasePath: selfieUpload.supabasePath,
      idSupabasePath: idUpload.supabasePath,
      extractedIdentity: analysis.extractedIdentity,
      localSyncedAt: null,
    };

    await saveVerificationRecord(record);

    return NextResponse.json({
      id: verificationId,
      status: record.status,
      matchScore: record.matchScore,
      summary: record.summary,
      reasons: record.reasons,
      extractedIdentity: record.extractedIdentity,
      mirroredToSupabase: Boolean(record.selfieSupabasePath && record.idSupabasePath),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected verification error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
