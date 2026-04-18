export type AppConfigStatus = {
  openAI: boolean;
  vercelBlob: boolean;
  supabaseMirror: boolean;
  requiredReady: boolean;
  requiredMissing: string[];
  optionalMissing: string[];
  localCloudDirectory: string;
  siteUrl: string | null;
};

export function getAppConfigStatus(): AppConfigStatus {
  const openAI = Boolean(process.env.OPENAI_API_KEY);
  const vercelBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const supabaseMirror = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const requiredMissing = [
    openAI ? null : "OPENAI_API_KEY",
    vercelBlob ? null : "BLOB_READ_WRITE_TOKEN",
  ].filter(Boolean) as string[];

  const optionalMissing = [
    supabaseMirror ? null : "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean) as string[];

  return {
    openAI,
    vercelBlob,
    supabaseMirror,
    requiredReady: requiredMissing.length === 0,
    requiredMissing,
    optionalMissing,
    localCloudDirectory:
      process.env.LOCAL_CLOUD_DIR ?? `${process.cwd()}/local-cloud/verifications`,
    siteUrl:
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      null,
  };
}
