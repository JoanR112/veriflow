import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCountryLabel } from "@/lib/countries";
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
  walletAddress: z.string().min(6).max(120),
  email: z.string().email(),
  fullName: z.string().min(3).max(120),
  dateOfBirth: z.string().min(10).max(20),
  countryCode: z.string().length(2),
  idType: z.enum(["passport", "national_id", "drivers_license"]),
  payoutMethod: z.enum(["crypto", "paypal"]),
  payoutDestination: z.string().min(3).max(160),
  deviceKind: z.enum(["desktop", "mobile"]),
  privacyAccepted: z.coerce.boolean(),
  biometricAccepted: z.coerce.boolean(),
  sanctionsAccepted: z.coerce.boolean(),
});

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
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
      walletAddress: formData.get("walletAddress"),
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      dateOfBirth: formData.get("dateOfBirth"),
      countryCode: formData.get("countryCode"),
      idType: formData.get("idType"),
      payoutMethod: formData.get("payoutMethod"),
      payoutDestination: formData.get("payoutDestination"),
      deviceKind: formData.get("deviceKind"),
      privacyAccepted: formData.get("privacyAccepted"),
      biometricAccepted: formData.get("biometricAccepted"),
      sanctionsAccepted: formData.get("sanctionsAccepted"),
    });

    const selfie = getFile(formData, "selfie");
    const idFront = getFile(formData, "idFront");
    const idBack = getFile(formData, "idBack");

    const verificationId = randomUUID();
    const [selfieUpload, idFrontUpload, idBackUpload] = await Promise.all([
      storeSensitiveUpload({
        verificationId,
        slot: "selfie",
        file: selfie,
      }),
      storeSensitiveUpload({
        verificationId,
        slot: "id_front",
        file: idFront,
      }),
      storeSensitiveUpload({
        verificationId,
        slot: "id_back",
        file: idBack,
      }),
    ]);

    const countryLabel = getCountryLabel(parsed.countryCode);
    const analysis = await verifyIdentityPair({
      username: parsed.username,
      amount: parsed.amount,
      selfie,
      idFront,
      idBack,
      idType: parsed.idType,
      countryLabel,
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
      contact: {
        walletAddress: parsed.walletAddress,
        email: parsed.email,
        fullName: parsed.fullName,
        dateOfBirth: parsed.dateOfBirth,
        countryCode: parsed.countryCode,
        countryLabel,
        idType: parsed.idType,
        payoutMethod: parsed.payoutMethod,
        payoutDestination: parsed.payoutDestination,
        deviceKind: parsed.deviceKind,
      },
      consents: {
        privacyAccepted: parsed.privacyAccepted,
        biometricAccepted: parsed.biometricAccepted,
        sanctionsAccepted: parsed.sanctionsAccepted,
      },
      selfieBlobUrl: selfieUpload.url,
      selfieBlobPath: selfieUpload.pathname,
      idFrontBlobUrl: idFrontUpload.url,
      idFrontBlobPath: idFrontUpload.pathname,
      idBackBlobUrl: idBackUpload.url,
      idBackBlobPath: idBackUpload.pathname,
      selfieSupabasePath: selfieUpload.supabasePath,
      idFrontSupabasePath: idFrontUpload.supabasePath,
      idBackSupabasePath: idBackUpload.supabasePath,
      extractedIdentity: analysis.extractedIdentity,
      localSyncedAt: null,
    };

    await saveVerificationRecord(record);

    return NextResponse.json({
      id: record.id,
      status: record.status,
      matchScore: record.matchScore,
      summary: record.summary,
      reasons: record.reasons,
      extractedIdentity: record.extractedIdentity,
      mirroredToSupabase: Boolean(
        record.selfieSupabasePath &&
          record.idFrontSupabasePath &&
          record.idBackSupabasePath,
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected verification error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
