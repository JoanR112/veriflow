# Veriflow

Veriflow is a Next.js 16 app for face-and-ID verification flows built around routes like:

`https://your-vercel-url.vercel.app/atlas/24.50`

That route renders:

- the request amount
- a QR code for phone handoff
- a mobile-friendly upload form for a selfie and a government ID
- an OpenAI-powered verification verdict

## What it does

1. The user opens `/username/amount`.
2. The page renders a QR code for the exact route.
3. The user uploads a live selfie and an ID photo.
4. Files are stored in **private Vercel Blob** storage.
5. The **OpenAI Responses API** compares the two images and returns a strict JSON decision.
6. If Supabase is configured, the media is mirrored there and the metadata is written into `public.verifications`.
7. `npm run sync:local-cloud` downloads unsynced finished records into a local folder on this computer.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- OpenAI Node SDK
- `@vercel/blob` for private media storage
- Supabase REST + Storage for optional mirroring
- `qrcode` for route QR generation

## Required environment variables

Create `.env.local` from `.env.example`.

Required for live verification:

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`

Optional but recommended:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`
- `NEXT_PUBLIC_SITE_URL`
- `LOCAL_CLOUD_DIR`

## Local development

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/atlas/24.50`

If port `3000` is taken, Next.js will move to the next free port.

## Supabase setup

Run the SQL in [supabase/schema.sql](/Users/joan/Desktop/App/supabase/schema.sql).

Create a storage bucket named `verification-media` unless you override it with `SUPABASE_BUCKET`.

The app writes the following record shape into `public.verifications`:

- request metadata
- OpenAI decision
- Vercel Blob URLs and pathnames
- optional mirrored Supabase storage paths
- local sync timestamp

## Local cloud sync

Run:

```bash
npm run sync:local-cloud
```

The script downloads unsynced private Blob files into:

`LOCAL_CLOUD_DIR/<username>/<verification-id>/`

Each synced directory gets:

- `selfie.bin`
- `id.bin`
- `manifest.json`

If Supabase is configured, sync status is updated in the `local_synced_at` column.

## Validation completed locally

- `npm run lint`
- `npm run build`
- browser screenshots captured for `/` and `/atlas/24.50`

## Notes

- The OpenAI verification is a conservative image comparison layer, not a regulated KYC system.
- The deployed app still needs real secrets in Vercel before submissions can succeed.
- The UI disables verification automatically when required secrets are missing.
