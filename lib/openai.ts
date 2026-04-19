import "server-only";

import OpenAI from "openai";

import type { VerificationDecision } from "@/lib/types";

const verificationSchema = {
  name: "identity_verification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      decision: {
        type: "string",
        enum: ["approved", "manual_review", "rejected"],
      },
      matchScore: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      idReadable: {
        type: "boolean",
      },
      faceMatches: {
        type: "boolean",
      },
      summary: {
        type: "string",
      },
      reasons: {
        type: "array",
        items: {
          type: "string",
        },
        minItems: 1,
        maxItems: 5,
      },
      extractedIdentity: {
        type: "object",
        additionalProperties: false,
        properties: {
          fullName: { type: "string" },
          documentType: { type: "string" },
          documentNumber: { type: "string" },
          dob: { type: "string" },
        },
        required: ["fullName", "documentType", "documentNumber", "dob"],
      },
    },
    required: [
      "decision",
      "matchScore",
      "idReadable",
      "faceMatches",
      "summary",
      "reasons",
      "extractedIdentity",
    ],
  },
} as const;

export type VerificationAnalysis = {
  decision: VerificationDecision;
  matchScore: number;
  idReadable: boolean;
  faceMatches: boolean;
  summary: string;
  reasons: string[];
  extractedIdentity: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    dob: string;
  };
};

function toDataUrl(buffer: Buffer, type: string) {
  return `data:${type};base64,${buffer.toString("base64")}`;
}

export async function verifyIdentityPair(input: {
  username: string;
  amount: number;
  selfie: File;
  idFront: File;
  idBack: File;
  idType: "passport" | "national_id" | "drivers_license";
  countryLabel: string;
}): Promise<VerificationAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const selfieBuffer = Buffer.from(await input.selfie.arrayBuffer());
  const idFrontBuffer = Buffer.from(await input.idFront.arrayBuffer());
  const idBackBuffer = Buffer.from(await input.idBack.arrayBuffer());

  const response = await client.responses.create({
    model: "gpt-5.1",
    reasoning: { effort: "medium" },
    text: {
      format: {
        type: "json_schema",
        ...verificationSchema,
      },
    },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are a conservative identity-verification assistant.",
              "Compare the selfie with the government ID photo.",
              "Approve only when the portrait clearly appears to be the same person and the ID is readable.",
              "Use manual_review when the images are ambiguous, blurry, partially cropped, or suspicious.",
              "Reject when the faces clearly do not match or the ID appears unusable.",
              "Do not invent missing fields; use 'unknown' when needed.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Username for this request: ${input.username}. Amount requested: ${(input.amount / 100).toFixed(2)} USD. Expected country: ${input.countryLabel}. Expected document type: ${input.idType}.`,
          },
          {
            type: "input_text",
            text: "Image A is a live selfie. Image B is the front of the identity document. Image C is the back of the identity document. Return strict JSON only.",
          },
          {
            type: "input_image",
            image_url: toDataUrl(selfieBuffer, input.selfie.type || "image/jpeg"),
            detail: "high",
          },
          {
            type: "input_image",
            image_url: toDataUrl(idFrontBuffer, input.idFront.type || "image/jpeg"),
            detail: "high",
          },
          {
            type: "input_image",
            image_url: toDataUrl(idBackBuffer, input.idBack.type || "image/jpeg"),
            detail: "high",
          },
        ],
      },
    ],
  });

  const output = response.output_text;

  if (!output) {
    throw new Error("OpenAI returned an empty verification payload.");
  }

  return JSON.parse(output) as VerificationAnalysis;
}
