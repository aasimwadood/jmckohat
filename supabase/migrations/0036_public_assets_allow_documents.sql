-- The public "Downloads" page (app/(public)/downloads/page.tsx) has always
-- pointed every download at the public-assets bucket, but that bucket's
-- allowed_mime_types (0010_storage.sql) was images-only — no document
-- (PDF, prospectus, policy) could ever have been uploaded to it. This
-- never surfaced earlier because no download row was ever created without
-- a real file to back it (deliberately, to avoid dead links — see
-- docs/MIGRATION_PLAN.md §10.1) — the first real document to actually
-- upload is what exposed it.
update storage.buckets
set
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain'],
  file_size_limit = 10485760
where id = 'public-assets';
