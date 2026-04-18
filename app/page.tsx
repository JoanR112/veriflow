import Link from "next/link";

import { ConfigNotice } from "@/components/config-notice";
import { getAppConfigStatus } from "@/lib/config";
import { currencyFormatter } from "@/lib/format";

const demoPath = "/atlas/2450";

const flowSteps = [
  {
    index: "01",
    title: "Request route",
    detail: "Every payer gets a dedicated path like `/username/amount` with a QR for phone-first verification.",
  },
  {
    index: "02",
    title: "Private upload",
    detail: "Selfie and document files land in a private Vercel Blob store so raw media stays off the public web.",
  },
  {
    index: "03",
    title: "OpenAI review",
    detail: "The OpenAI Responses API compares the live selfie against the portrait on the ID and returns a strict JSON verdict.",
  },
  {
    index: "04",
    title: "Supabase + local cloud",
    detail: "Metadata can be mirrored into Supabase, while the local sync script pulls finished verifications into a folder on this machine.",
  },
];

export default function Home() {
  const config = getAppConfigStatus();

  return (
    <main className="relative overflow-hidden">
      <div className="hero-grid" />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent-soft)]">
              Veriflow
            </p>
            <p className="mt-2 max-w-md text-sm text-white/58">
              Vercel-native identity capture for payment or payout requests.
            </p>
          </div>
          <Link href={demoPath} className="ghost-button">
            Open live route
          </Link>
        </header>

        <div className="grid gap-14 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-8">
            <p className="max-w-md font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">
              Face match. ID upload. Blob storage. Supabase mirror. Local sync.
            </p>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">
                A verification request that starts with a QR and ends in your local cloud.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                The public route is the handoff point. The QR sends the user to the same
                verification page on mobile, uploads go into Vercel Blob, OpenAI checks the
                selfie against the ID, and the completed media can mirror into Supabase before
                landing on this computer.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href={demoPath} className="primary-button">
                Try demo route
              </Link>
              <a href="#system" className="ghost-button">
                Inspect system map
              </a>
            </div>

            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              <div className="metric-panel">
                <span>Route format</span>
                <strong>{demoPath}</strong>
              </div>
              <div className="metric-panel">
                <span>Sample amount</span>
                <strong>{currencyFormatter.format(24.5)}</strong>
              </div>
              <div className="metric-panel">
                <span>Media target</span>
                <strong>Private Blob</strong>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="phone-shell rotate-[-5deg]">
              <div className="phone-status">
                <span>Session live</span>
                <span>100%</span>
              </div>
              <div className="phone-screen">
                <div className="space-y-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent-soft)]">
                    Request / atlas / 24.50
                  </p>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                    Verify your identity before the transfer clears.
                  </h2>
                  <p className="text-sm leading-6 text-white/62">
                    Scan the route QR on your desktop, upload a selfie and a photo of your ID,
                    then wait for the OpenAI match score and storage sync.
                  </p>
                </div>
                <div className="screen-progress">
                  <span className="active">Face</span>
                  <span>ID</span>
                  <span>Review</span>
                </div>
                <div className="screen-orbs">
                  <div className="selfie-orb" />
                  <div className="id-orb" />
                </div>
                <div className="screen-footer">
                  <div>
                    <span>Blob</span>
                    <strong>Private</strong>
                  </div>
                  <div>
                    <span>Sync</span>
                    <strong>Supabase</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="glow-card">
              <span>Pipeline</span>
              <strong>QR → Upload → OpenAI → Supabase → Local folder</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="border-t border-white/10 bg-black/35">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-18 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
          <div className="space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">
              System map
            </p>
            <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              The handoff is simple for the user, but the backend still stays deliberate.
            </h2>
            <p className="max-w-lg text-sm leading-7 text-white/58">
              This build assumes Vercel Blob for the raw media, OpenAI for a conservative match
              verdict, Supabase for metadata and optional storage mirroring, and a local node
              script for your machine-side archive.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {flowSteps.map((step) => (
              <article key={step.index} className="system-step">
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--accent-soft)]">
                  {step.index}
                </p>
                <h3 className="mt-3 text-xl font-medium text-white">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/60">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-10 lg:px-12">
        <ConfigNotice config={config} />
      </section>
    </main>
  );
}
