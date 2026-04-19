export type VerificationDecision = "approved" | "manual_review" | "rejected";

export type PayoutMethod = "crypto" | "paypal";

export type DeviceKind = "desktop" | "mobile";

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
  contact: {
    walletAddress: string;
    email: string;
    fullName: string;
    dateOfBirth: string;
    countryCode: string;
    countryLabel: string;
    idType: "passport" | "national_id" | "drivers_license";
    payoutMethod: PayoutMethod;
    payoutDestination: string;
    deviceKind: DeviceKind;
  };
  consents: {
    privacyAccepted: boolean;
    biometricAccepted: boolean;
    sanctionsAccepted: boolean;
  };
  selfieBlobUrl: string;
  selfieBlobPath: string;
  idFrontBlobUrl: string;
  idFrontBlobPath: string;
  idBackBlobUrl: string;
  idBackBlobPath: string;
  selfieSupabasePath: string | null;
  idFrontSupabasePath: string | null;
  idBackSupabasePath: string | null;
  extractedIdentity: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    dob: string;
  };
  localSyncedAt: string | null;
};
