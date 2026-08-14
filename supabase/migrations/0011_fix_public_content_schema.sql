-- Corrections found while porting the actual public pages (Phase 7),
-- superseding guesses made in 0009 before the legacy page source was
-- re-read closely. Forward-only migration — 0009 already shipped to the
-- live project, so it's fixed up here rather than edited in place.

-- Leadership: legacy AboutPage.tsx renders `{title} {firstName} {lastName}`,
-- `{position}`, `{department}` — not the generic name/designation guessed
-- in 0009. Table is empty so far, safe to reshape.
alter table leadership
  drop column name,
  drop column designation,
  add column title text,
  add column first_name text,
  add column last_name text,
  add column "position" text,
  add column department text;

-- site_settings: legacy Configuration rows are plain strings
-- (configMap["OurMission"] etc.), not JSON documents.
alter table site_settings alter column value type text using value::text;
alter table site_settings alter column value set default '';
