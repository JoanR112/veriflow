import type { AppConfigStatus } from "@/lib/config";

type Props = {
  config: AppConfigStatus;
};

export function ConfigNotice({ config }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="config-card">
        <span>Deployment state</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          {config.requiredReady
            ? "The core verification pipeline is code-complete."
            : "The app is built, but the secrets are not wired yet."}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/62">
          Required env vars make the live verification work. Supabase is optional but enables
          mirrored storage plus the machine-side archive workflow.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="config-card">
          <span>Required now</span>
          <ul className="mt-5 space-y-3 text-sm text-white/78">
            {config.requiredMissing.length ? (
              config.requiredMissing.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>OPENAI + Blob are configured.</li>
            )}
          </ul>
        </div>
        <div className="config-card">
          <span>Optional but useful</span>
          <ul className="mt-5 space-y-3 text-sm text-white/78">
            {config.optionalMissing.length ? (
              config.optionalMissing.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>Supabase mirror is configured.</li>
            )}
          </ul>
          <p className="mt-6 text-xs uppercase tracking-[0.26em] text-white/35">
            Local sync target
          </p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--accent-soft)]">
            {config.localCloudDirectory}
          </p>
        </div>
      </div>
    </div>
  );
}
