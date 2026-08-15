-- Multi-college public website, part 1: schema + data migration.
--
-- Adds branding/identity columns to `colleges` (built in the earlier HED-
-- hierarchy phase, 0027, but with no public-facing identity fields yet),
-- and a nullable `college_id` to every public-content table from
-- 0009_public_content.sql (plus the three department-linked directory
-- tables). Nullable is the global/shared-content mechanism throughout this
-- app: a NULL `college_id` row is shown on every college's public site
-- (spec's "Global HED/GMC Content"), a non-null row only on that one
-- college's site. This is additive only — no existing column on any of
-- these tables is touched, so nothing that already reads them breaks
-- before the follow-up routing/RLS work lands.
--
-- `announcements` (dashboard-internal, not rendered on any public page)
-- is deliberately left out of this migration — it's already scoped via
-- department_id → departments.college_id where relevant, and adding a
-- second, unused scoping column to it here would be schema churn beyond
-- what "public website" actually needs.

-- colleges: branding/identity ------------------------------------------

alter table colleges
  add column slug text,
  add column logo_path text,
  add column favicon_path text,
  add column banner_path text,
  add column principal_name text,
  add column principal_photo_path text,
  add column about_content text,
  add column facebook_url text,
  add column twitter_url text,
  add column youtube_url text,
  add column theme_color text;

create unique index colleges_slug_unique_idx on colleges (slug) where slug is not null;

-- Backfill GPGC Kohat's own slug + the branding fields that already have
-- an obvious real source, so its own public pages render identically once
-- Header/Footer switch to reading from `colleges` instead of hardcoded
-- strings. Everything else (about_content, theme_color, banner) is left
-- null deliberately — the About page's real content keeps flowing through
-- the now-college-scoped `site_settings`/`leadership` tables below, not a
-- duplicate copy in this summary field.
update colleges
set slug = 'gpgc-kohat',
    logo_path = '/images/logo.png',
    principal_name = (
      select trim(coalesce(l.title, '') || ' ' || coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, ''))
      from leadership l
      where l.position ilike '%principal%'
      order by l.display_order
      limit 1
    )
where code = 'GPGC-KOH';

-- Public-content tables: add college_id, backfill to GPGC Kohat --------

do $$
declare
  t text;
  gpgc_id uuid;
  tables text[] := array[
    'leadership', 'portal_highlights', 'portal_news', 'portal_stats',
    'portal_features', 'institution_faculties', 'portal_quick_stats',
    'faculty_categories', 'faculty_directory', 'download_categories',
    'downloads', 'program_categories', 'program_details',
    'program_requirements', 'program_fees', 'additional_fee_categories',
    'additional_fee_items', 'apply_steps', 'important_dates', 'footer_info',
    'contact_info', 'office_hours', 'department_contacts', 'campus_locations'
  ];
begin
  select id into gpgc_id from colleges where code = 'GPGC-KOH';

  foreach t in array tables loop
    execute format('alter table %I add column college_id uuid references colleges (id) on delete cascade', t);
    execute format('update %I set college_id = %L where college_id is null', t, gpgc_id);
    execute format('create index %I_college_id_idx on %I (college_id)', t, t);
  end loop;
end $$;

-- site_settings: structural exception — PK becomes (college_id, key)
-- rather than gaining a plain nullable column, since every college needs
-- its own full settings (not a shared bag with a null-fallback layer,
-- which wasn't asked for).
alter table site_settings drop constraint site_settings_pkey;
alter table site_settings add column college_id uuid references colleges (id) on delete cascade;
update site_settings set college_id = (select id from colleges where code = 'GPGC-KOH') where college_id is null;
alter table site_settings alter column college_id set not null;
alter table site_settings add primary key (college_id, key);
