import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16 sm:px-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent-soft)]">
        Veriflow
      </p>
      <h1 className="text-5xl font-semibold tracking-[-0.05em] text-white">
        This verification route does not exist.
      </h1>
      <p className="max-w-xl text-sm leading-7 text-white/58">
        Use a valid pattern like `/atlas/24.50` so the request can resolve a username and amount.
      </p>
      <Link href="/" className="primary-button">
        Return home
      </Link>
    </main>
  );
}
