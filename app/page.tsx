import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-card">
        <p className="landing-kicker">Okpay route verification</p>
        <h1 className="landing-title">Real KYC now lives on the route itself.</h1>
        <p className="landing-copy">
          Open a live request path to review mandatory inputs, device-aware QR
          handoff, real document uploads, and persisted verification metadata.
        </p>
        <Link href="/atlas/100" className="kyc-button landing-button">
          Open demo route
        </Link>
      </div>
    </main>
  );
}
