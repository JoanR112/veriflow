import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import QRCode from "qrcode";

import { StatusPill } from "@/components/status-pill";
import { VerificationForm } from "@/components/verification-form";
import { getAppConfigStatus } from "@/lib/config";
import { currencyFormatter, formatAmountFromPathSegment, titleFromUsername } from "@/lib/format";

type PageProps = {
  params: Promise<{
    username: string;
    amount: string;
  }>;
};

async function buildRequestUrl(username: string, amount: string) {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return null;
  }

  return `${protocol}://${host}/${username}/${amount}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const amount = formatAmountFromPathSegment(resolvedParams.amount);

  if (!amount) {
    return {};
  }

  return {
    title: `${titleFromUsername(resolvedParams.username)} · ${currencyFormatter.format(amount.value)} · Veriflow`,
    description:
      "Private face-and-ID verification request with QR handoff, OpenAI review, and Vercel Blob storage.",
  };
}

export default async function VerificationRoute({ params }: PageProps) {
  const resolvedParams = await params;
  const amount = formatAmountFromPathSegment(resolvedParams.amount);

  if (!amount) {
    notFound();
  }

  const requestUrl = await buildRequestUrl(resolvedParams.username, resolvedParams.amount);
  const qrSource = requestUrl
    ? await QRCode.toDataURL(requestUrl, {
        width: 900,
        margin: 1,
        color: {
          dark: "#f4f1ff",
          light: "#0e0f15",
        },
      })
    : null;

  const config = getAppConfigStatus();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:px-10 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent-soft)]">
            Verification route
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            {titleFromUsername(resolvedParams.username)}
          </h1>
        </div>
        <Link href="/" className="ghost-button">
          Back to overview
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <div className="summary-panel">
            <span>Transfer amount</span>
            <p className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
              {currencyFormatter.format(amount.value)}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/60">
              This route is the public handoff path. Desktop users can scan the QR to continue on
              a phone. Mobile users can submit the selfie and ID directly from this page.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StatusPill status={config.requiredReady ? "approved" : "rejected"} />
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/58">
                Vercel Blob → OpenAI → Supabase → Local cloud
              </span>
            </div>
          </div>

          <div className="request-panel">
            <span>Session guide</span>
            <ul className="timeline-track mt-6">
              <li>Open the route on your phone by scanning the QR.</li>
              <li>Capture a bright selfie and a readable government ID image.</li>
              <li>Wait for the OpenAI match score and storage sync response.</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="request-panel flex flex-col items-center justify-between gap-5">
            <div className="w-full">
              <span>Scan to continue</span>
              <h2 className="mt-4 text-2xl font-semibold text-white">QR handoff</h2>
              <p className="mt-3 text-sm leading-7 text-white/58">
                The QR encodes this exact request path so the user lands on the right
                `/username/amount` session.
              </p>
            </div>
            {qrSource ? (
              <Image
                src={qrSource}
                alt="Verification route QR code"
                width={420}
                height={420}
                className="rounded-[30px] border border-white/10 bg-[#0e0f15] p-5"
                unoptimized
              />
            ) : (
              <div className="flex h-[18rem] w-full items-center justify-center rounded-[30px] border border-dashed border-white/12 text-sm text-white/45">
                QR unavailable without a request URL host.
              </div>
            )}
            <p className="break-all text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/34">
              {requestUrl ?? "Request URL unavailable in this runtime."}
            </p>
          </div>

          <VerificationForm
            username={resolvedParams.username}
            amount={amount.cents}
            requestUrl={requestUrl ?? `/${resolvedParams.username}/${resolvedParams.amount}`}
            ready={config.requiredReady}
            missing={config.requiredMissing}
          />
        </div>
      </section>
    </main>
  );
}
