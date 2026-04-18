import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

export const supabaseBucket =
  process.env.SUPABASE_BUCKET ?? "verification-media";

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRole) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
