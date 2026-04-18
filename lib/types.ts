export type VerificationDecision = "approved" | "manual_review" | "rejected";

export type VerificationRecord = {
  id: string;
  username: string;
  amount: number;
  requestUrl: string;
  createdAt: string;
  status: VerificationDecision;
  matchScore: number;
  summary: string;
  reasons: string[];
  idReadable: boolean;
  faceMatches: boolean;
  selfieBlobUrl: string;
  selfieBlobPath: string;
  idBlobUrl: string;
  idBlobPath: string;
  selfieSupabasePath: string | null;
  idSupabasePath: string | null;
  extractedIdentity: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    dob: string;
  };
  localSyncedAt: string | null;
};
