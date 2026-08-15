-- HED hierarchy, part 2: schema, org-scope columns, RLS helper functions,
-- and RLS for the new org tables themselves.
--
-- Does NOT touch RLS on the existing ~65 college-domain tables (courses,
-- admissions, results, etc.) — that additive rewrite (adding hed_admin/
-- directorate_admin/jmc_admin visibility on top of the existing
-- admin/department/faculty policies, without changing what already works)
-- is its own later sub-phase. See docs/MIGRATION_PLAN.md §9.3–9.4.

create type org_status as enum ('active', 'inactive');

-- College Types -----------------------------------------------------------
-- Deliberately its own small reference table, not a fixed enum, per spec
-- §9: "architecture should allow additional college types to be added
-- later without major code changes."
create table college_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- e.g. "GPGC", "GDC"
  name text not null,          -- e.g. "Government Post Graduate College"
  created_at timestamptz not null default now()
);

insert into college_types (code, name) values
  ('GPGC', 'Government Post Graduate College'),
  ('GDC', 'Government Degree College');

-- Directorates --------------------------------------------------------------
create table directorates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  status org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger directorates_set_updated_at
  before update on directorates
  for each row execute function set_updated_at();

-- JMCs (Joint Management Councils) -------------------------------------------
create table jmcs (
  id uuid primary key default gen_random_uuid(),
  directorate_id uuid not null references directorates (id) on delete restrict,
  name text not null,
  code text not null unique,
  district text,
  division text,
  address text,
  contact_number text,
  email text,
  jmc_admin_profile_id uuid,   -- FK added below, after profiles gets jmc_id
  status org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jmcs_directorate_id_idx on jmcs (directorate_id);

create trigger jmcs_set_updated_at
  before update on jmcs
  for each row execute function set_updated_at();

-- Colleges --------------------------------------------------------------------
create table colleges (
  id uuid primary key default gen_random_uuid(),
  jmc_id uuid not null references jmcs (id) on delete restrict,
  college_type_id uuid not null references college_types (id) on delete restrict,
  name text not null,
  code text not null unique,
  district text,
  division text,
  address text,
  contact_number text,
  email text,
  college_admin_profile_id uuid references profiles (id) on delete set null,
  status org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index colleges_jmc_id_idx on colleges (jmc_id);
create index colleges_college_type_id_idx on colleges (college_type_id);

create trigger colleges_set_updated_at
  before update on colleges
  for each row execute function set_updated_at();

-- Org-scope columns on existing tables ---------------------------------------
-- Nullable for now: departments.college_id is backfilled and made NOT NULL
-- in the data migration (0028), once the seed college row exists.
alter table departments add column college_id uuid references colleges (id) on delete restrict;
create index departments_college_id_idx on departments (college_id);

-- profiles.college_id is a denormalized copy of departments.college_id
-- (kept in sync by the trigger below) so every future RLS policy can check
-- current_college_id() directly instead of joining through departments on
-- every row. Only set directly (not derived) for the three org-admin roles
-- that aren't associated with an academic department at all.
alter table profiles
  add column directorate_id uuid references directorates (id) on delete set null,
  add column jmc_id uuid references jmcs (id) on delete set null,
  add column college_id uuid references colleges (id) on delete set null;

create index profiles_directorate_id_idx on profiles (directorate_id);
create index profiles_jmc_id_idx on profiles (jmc_id);
create index profiles_college_id_idx on profiles (college_id);

alter table jmcs
  add constraint jmcs_jmc_admin_profile_id_fkey
  foreign key (jmc_admin_profile_id) references profiles (id) on delete set null;

create or replace function sync_profile_college_id()
returns trigger
language plpgsql
as $$
begin
  if new.department_id is not null then
    select college_id into new.college_id from departments where id = new.department_id;
  end if;
  return new;
end;
$$;

create trigger profiles_sync_college_id
  before insert or update of department_id on profiles
  for each row execute function sync_profile_college_id();

-- RLS helper functions, mirroring current_user_role()/current_department_id()
-- in 0002_orgs.sql — SECURITY DEFINER + fixed search_path so they can read
-- `profiles` regardless of the caller's own RLS visibility into that table.
create or replace function current_college_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select college_id from profiles where id = auth.uid();
$$;

create or replace function current_jmc_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select jmc_id from profiles where id = auth.uid();
$$;

create or replace function current_directorate_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select directorate_id from profiles where id = auth.uid();
$$;

-- RLS on the new org tables -----------------------------------------------

alter table college_types enable row level security;
alter table directorates enable row level security;
alter table jmcs enable row level security;
alter table colleges enable row level security;

-- college_types: plain reference data, readable by any signed-in user,
-- writable only by hed_admin.
create policy "college_types_select_authenticated" on college_types
  for select to authenticated using (true);
create policy "college_types_write_hed_admin" on college_types
  for all to authenticated
  using (current_user_role() = 'hed_admin')
  with check (current_user_role() = 'hed_admin');

-- directorates: visible to hed_admin (all), the directorate's own admin,
-- and to anyone whose jmc/college falls under it (read-only context, e.g.
-- for a breadcrumb) — never to an unrelated directorate/jmc/college.
create policy "directorates_select_scoped" on directorates
  for select to authenticated
  using (
    current_user_role() = 'hed_admin'
    or id = current_directorate_id()
    or id in (select directorate_id from jmcs where id = current_jmc_id())
    or id in (
      select j.directorate_id from jmcs j
      join colleges c on c.jmc_id = j.id
      where c.id = current_college_id()
    )
  );
create policy "directorates_write_hed_admin" on directorates
  for all to authenticated
  using (current_user_role() = 'hed_admin')
  with check (current_user_role() = 'hed_admin');

-- jmcs: hed_admin sees all; directorate_admin sees jmcs under their own
-- directorate; jmc_admin sees their own jmc; college-scoped roles see the
-- jmc their own college belongs to.
create policy "jmcs_select_scoped" on jmcs
  for select to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and directorate_id = current_directorate_id())
    or id = current_jmc_id()
    or id in (select jmc_id from colleges where id = current_college_id())
  );
create policy "jmcs_write_hed_or_directorate" on jmcs
  for all to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and directorate_id = current_directorate_id())
  )
  with check (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and directorate_id = current_directorate_id())
  );

-- colleges: hed_admin sees all; directorate_admin sees colleges under jmcs
-- in their directorate; jmc_admin sees colleges under their own jmc;
-- college-scoped roles see only their own college.
create policy "colleges_select_scoped" on colleges
  for select to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (
      current_user_role() = 'directorate_admin'
      and jmc_id in (select id from jmcs where directorate_id = current_directorate_id())
    )
    or (current_user_role() = 'jmc_admin' and jmc_id = current_jmc_id())
    or id = current_college_id()
  );
create policy "colleges_write_hed_directorate_or_jmc" on colleges
  for all to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (
      current_user_role() = 'directorate_admin'
      and jmc_id in (select id from jmcs where directorate_id = current_directorate_id())
    )
    or (current_user_role() = 'jmc_admin' and jmc_id = current_jmc_id())
  )
  with check (
    current_user_role() = 'hed_admin'
    or (
      current_user_role() = 'directorate_admin'
      and jmc_id in (select id from jmcs where directorate_id = current_directorate_id())
    )
    or (current_user_role() = 'jmc_admin' and jmc_id = current_jmc_id())
  );
