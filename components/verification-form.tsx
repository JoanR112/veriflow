"use client";

import { useState, useTransition } from "react";

import { StatusPill } from "@/components/status-pill";
import { currencyFormatter } from "@/lib/format";
import type { VerificationDecision } from "@/lib/types";

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

type ErrorResponse = {
  error?: string;
  missing?: string[];
};

type Props = {
  username: string;
  amount: number;
  requestUrl: string;
  ready: boolean;
  missing: string[];
};

export function VerificationForm({
  username,
  amount,
  requestUrl,
  ready,
  missing,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as VerificationResponse | ErrorResponse;

      if (!response.ok) {
        const errorPayload = payload as ErrorResponse;
        setResult(null);
        setError(
          errorPayload.error ??
            "The verification request failed before a decision could be returned.",
        );
        return;
      }

      setResult(payload as VerificationResponse);
      form.reset();
    });
  }

  return (
    <div className="space-y-5">
      <div className="summary-panel">
        <span>Verification payload</span>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Username</p>
            <p className="mt-2 text-2xl font-semibold text-white">{username}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Amount</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {currencyFormatter.format(amount / 100)}
            </p>
          </div>
        </div>
        <p className="mt-6 break-all font-mono text-xs text-[var(--muted)]">{requestUrl}</p>
      </div>

      <form className="request-panel space-y-5" onSubmit={handleSubmit}>
        <input type="hidden" name="username" value={username} />
        <input type="hidden" name="amount" value={amount.toString()} />
        <input type="hidden" name="requestUrl" value={requestUrl} />

        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
            Capture both images in one session.
          </h3>
          <p className="text-sm leading-7 text-white/58">
            Use the front-facing camera for the selfie and a clean photo of the government ID.
            The face match is conservative and falls back to manual review when the images are
            unclear.
          </p>
        </div>

        {!ready ? (
          <div className="rounded-[24px] border border-[var(--warning)]/30 bg-[var(--warning)]/8 p-4 text-sm text-[var(--warning)]">
            Verification is disabled in this deployment until these vars are set:{" "}
            {missing.join(", ")}.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field-shell">
            <label htmlFor="selfie">Live selfie</label>
            <input
              id="selfie"
              name="selfie"
              type="file"
              accept="image/*"
              capture="user"
              required
              disabled={!ready || isPending}
            />
          </div>
          <div className="field-shell">
            <label htmlFor="idPhoto">Government ID</label>
            <input
              id="idPhoto"
              name="idPhoto"
              type="file"
              accept="image/*"
              capture="environment"
              required
              disabled={!ready || isPending}
            />
          </div>
        </div>

        <button
          type="submit"
          className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!ready || isPending}
        >
          {isPending ? "Analyzing..." : "Submit verification"}
        </button>

        {error ? (
          <div className="rounded-[24px] border border-[var(--danger)]/25 bg-[var(--danger)]/8 p-4 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}
      </form>

      {result ? (
        <div className="status-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span>Decision</span>
              <h4 className="mt-3 text-2xl font-semibold text-white">{result.summary}</h4>
            </div>
            <StatusPill status={result.status} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/35">Match score</p>
              <p className="mt-2 text-3xl font-semibold text-white">{result.matchScore}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/35">Identity</p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {result.extractedIdentity.fullName}
                <br />
                {result.extractedIdentity.documentType}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/35">Mirror</p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {result.mirroredToSupabase
                  ? "Mirrored to Supabase storage."
                  : "Stored in Blob only for now."}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Reasons</p>
            <ul className="timeline-track mt-4">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
