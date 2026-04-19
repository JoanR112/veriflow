create table if not exists public.verifications (
  id text primary key,
  username text not null,
  amount integer not null,
  request_url text not null,
  created_at timestamptz not null,
  status text not null,
  match_score numeric not null,
  summary text not null,
  reasons jsonb not null,
  id_readable boolean not null,
  face_matches boolean not null,
  contact jsonb not null,
  consents jsonb not null,
  selfie_blob_url text not null,
  selfie_blob_path text not null,
  id_front_blob_url text not null,
  id_front_blob_path text not null,
  id_back_blob_url text not null,
  id_back_blob_path text not null,
  selfie_supabase_path text,
  id_front_supabase_path text,
  id_back_supabase_path text,
  extracted_identity jsonb not null,
  local_synced_at timestamptz
);

create index if not exists verifications_created_at_idx
  on public.verifications (created_at desc);
