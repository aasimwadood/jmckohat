-- Shared helper: keeps updated_at current on any table that has the column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Departments (created before profiles; hod_profile_id FK added after
-- profiles exists, to avoid a forward reference).
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,        -- 2-letter code used in registration numbers, e.g. "CS"
  hod_profile_id uuid,               -- FK added below, after profiles exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger departments_set_updated_at
  before update on departments
  for each row execute function set_updated_at();

-- Profiles: 1:1 extension of auth.users. Never insert into this table from
-- client code directly for anything other than a student's own row via the
-- signup trigger below — staff roles are provisioned server-side only
-- (see lib/auth/provision-staff.ts, Phase 4), because self-registration is
-- restricted to the student role.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null,
  phone text,
  department_id uuid references departments (id) on delete set null,
  avatar_path text,                  -- Storage object path, not a public URL
  current_semester_id uuid,          -- FK added in 0006, after semesters/promotions exist
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_department_id_idx on profiles (department_id);
create index profiles_role_idx on profiles (role);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table departments
  add constraint departments_hod_profile_id_fkey
  foreign key (hod_profile_id) references profiles (id) on delete set null;

-- Helper functions used throughout RLS policies. SECURITY DEFINER + a fixed
-- search_path so they can read `profiles` regardless of the caller's own
-- RLS visibility into that table (avoids recursive-policy issues).
create or replace function current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_department_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select department_id from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select current_user_role() in ('admin', 'principal', 'controller', 'coordinator', 'administration');
$$;

-- Programs, academic sessions, semesters ---------------------------------

create table programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments (id) on delete cascade,
  name text not null,
  degree_level text not null,        -- e.g. "BS", "MSc" — free text, not enumerated in the legacy app either
  created_at timestamptz not null default now()
);

create index programs_department_id_idx on programs (department_id);

create table academic_sessions (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,        -- e.g. "2024"
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table semesters (
  id uuid primary key default gen_random_uuid(),
  academic_session_id uuid not null references academic_sessions (id) on delete cascade,
  number int not null check (number between 1 and 8),
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (academic_session_id, number)
);

alter table profiles
  add constraint profiles_current_semester_id_fkey
  foreign key (current_semester_id) references semesters (id) on delete set null;

-- Handle new-user signup: only ever creates a STUDENT profile. Staff
-- accounts are created server-side via the admin client and insert their
-- own profiles.department_id/role directly — the trigger only fires the
-- default path when auth.users gets a row with no matching profile yet.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = new.id) then
    insert into profiles (id, role, full_name, email, department_id)
    values (
      new.id,
      'student',
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.email,
      nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS ---------------------------------------------------------------------

alter table departments enable row level security;
alter table profiles enable row level security;
alter table programs enable row level security;
alter table academic_sessions enable row level security;
alter table semesters enable row level security;

-- Departments/programs/sessions/semesters: publicly readable (the public
-- Departments page and the student registration form's department picker
-- both need this before the visitor has a session), writable only by admin.
create policy "departments_select_public" on departments
  for select to anon, authenticated using (true);
create policy "departments_write_admin" on departments
  for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "programs_select_public" on programs
  for select to anon, authenticated using (true);
create policy "programs_write_admin" on programs
  for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "academic_sessions_select_authenticated" on academic_sessions
  for select to authenticated using (true);
create policy "academic_sessions_write_admin" on academic_sessions
  for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "semesters_select_authenticated" on semesters
  for select to authenticated using (true);
create policy "semesters_write_admin" on semesters
  for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- Profiles: everyone can see their own; department peers (staff of the same
-- department) can see each other for rosters; admin/principal see all.
-- Nobody can write role/department_id from the client — only via the
-- server-side provisioning path (service-role client), enforced by simply
-- not granting an "update" policy for role changes at all here; the
-- self-service "update own basic info" policy below explicitly excludes
-- role/department_id by only allowing it through a security-definer RPC
-- (see 0009_role_permissions_audit.sql) rather than a raw table policy.
create policy "profiles_select_self" on profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_select_same_department" on profiles
  for select to authenticated
  using (department_id is not null and department_id = current_department_id());

create policy "profiles_select_admin_wide" on profiles
  for select to authenticated
  using (current_user_role() in ('admin', 'principal'));

create policy "profiles_update_self_basic_info" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Defense in depth beyond the row-level policy above: RLS alone cannot
-- stop an authenticated user from including `role`/`department_id`/
-- `is_active` in their own UPDATE statement. Restrict the *columns* the
-- authenticated role may write so those fields are only ever changed via
-- the security-definer RPCs (service-role client / admin functions), never
-- directly through PostgREST.
revoke update on profiles from authenticated;
grant update (full_name, phone, avatar_path) on profiles to authenticated;
