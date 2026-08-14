-- Public marketing-site CMS content. Every table here is publicly
-- readable (anon + authenticated) and writable only by admin — mirrors the
-- ~20 read-only "getall" endpoints the legacy frontend called for About,
-- Home, Departments, Programs, Faculty, Downloads, Fee Structure, Contact
-- and the Footer. Field names follow the legacy interfaces where the audit
-- captured them (e.g. Footer); the rest are inferred from usage since the
-- legacy backend source wasn't available to inspect directly.

alter table departments
  add column description text,
  add column image_path text,
  add column established_year int;

create table site_settings (
  key text primary key,        -- e.g. 'about.mission', 'home.hero'
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table leadership (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null,
  message text,
  photo_path text,
  display_order int not null default 0
);

create table portal_highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  display_order int not null default 0
);

create table portal_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  published_at date not null default current_date
);

create table portal_stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  display_order int not null default 0
);

create table portal_features (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon text,
  display_order int not null default 0
);

create table faculty_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order int not null default 0
);

create table faculty_directory (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references faculty_categories (id) on delete set null,
  department_id uuid references departments (id) on delete set null,
  name text not null,
  designation text,
  qualification text,
  photo_path text,
  display_order int not null default 0
);

create table download_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order int not null default 0
);

create table downloads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references download_categories (id) on delete set null,
  title text not null,
  file_path text not null,
  uploaded_at timestamptz not null default now()
);

create table program_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order int not null default 0
);

create table program_details (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references program_categories (id) on delete set null,
  department_id uuid references departments (id) on delete set null,
  name text not null,
  duration text,
  description text,
  display_order int not null default 0
);

create table program_requirements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references program_categories (id) on delete set null,
  requirement text not null,
  display_order int not null default 0
);

create table program_fees (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references program_categories (id) on delete set null,
  fee_head text not null,
  amount numeric not null,
  display_order int not null default 0
);

create table additional_fee_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order int not null default 0
);

create table additional_fee_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references additional_fee_categories (id) on delete set null,
  item_name text not null,
  amount numeric not null,
  display_order int not null default 0
);

create table apply_steps (
  id uuid primary key default gen_random_uuid(),
  step_number int not null,
  title text not null,
  description text
);

create table important_dates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  event_date date not null,
  display_order int not null default 0
);

create table footer_info (
  id uuid primary key default gen_random_uuid(),
  location text,
  phone_no text,
  email text,
  copyright text
);

create table contact_info (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  display_order int not null default 0
);

create table office_hours (
  id uuid primary key default gen_random_uuid(),
  day_range text not null,
  hours text not null,
  display_order int not null default 0
);

create table department_contacts (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments (id) on delete cascade,
  phone text,
  email text
);

create table campus_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  map_url text
);

-- RLS: every table below is public-read, admin-write, via one shared
-- pattern (DO block to avoid ~40 lines of copy-paste).
do $$
declare
  t text;
  tables text[] := array[
    'site_settings', 'leadership', 'portal_highlights', 'portal_news',
    'portal_stats', 'portal_features', 'faculty_categories', 'faculty_directory',
    'download_categories', 'downloads', 'program_categories', 'program_details',
    'program_requirements', 'program_fees', 'additional_fee_categories',
    'additional_fee_items', 'apply_steps', 'important_dates', 'footer_info',
    'contact_info', 'office_hours', 'department_contacts', 'campus_locations'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s_select_public" on %I for select to anon, authenticated using (true)', t, t);
    execute format('create policy "%s_write_admin" on %I for all to authenticated using (current_role() = ''admin'') with check (current_role() = ''admin'')', t, t);
  end loop;
end $$;
