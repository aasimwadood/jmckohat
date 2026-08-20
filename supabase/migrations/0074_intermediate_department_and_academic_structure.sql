-- Shift Management, Phase 2: BS/Intermediate isolation is enforced the
-- cheap, proven way — one real "Intermediate" department row, with the new
-- Focal Person role's own profiles.department_id pointing at it, reusing
-- the existing current_department_id()-scoped RLS already present across
-- ~20 policies rather than building a parallel scoping axis. 'IN' verified
-- free against the live departments.code values (all 17 real BS
-- departments use 3-4 letter codes; none collide).
insert into departments (name, code, college_id)
select 'Intermediate', 'IN', id from colleges where code = 'GPGC-KOH'
on conflict (code) do nothing;

-- Groups (Pre-Medical, Pre-Engineering, Computer Science, Arts, Humanities,
-- ...) — configurable, not hardcoded, structural copy of shifts (0072) but
-- department-scoped rather than college-scoped, since Groups are an
-- Intermediate-only organizational concept (deliberately separate from the
-- existing `programs` table, which stays the fee-structure-driving concept
-- it already is).
create table groups (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments (id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order int not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, code)
);

create index groups_department_idx on groups (department_id);

create trigger groups_set_updated_at
  before update on groups
  for each row execute function set_updated_at();

alter table groups enable row level security;

create policy "groups_select_authenticated" on groups
  for select to authenticated using (true);

create policy "groups_write_admin_principal_focal" on groups
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and department_college_id(department_id) = current_college_id())
    or (current_user_role() = 'focal_person_intermediate' and department_id = current_department_id())
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and department_college_id(department_id) = current_college_id())
    or (current_user_role() = 'focal_person_intermediate' and department_id = current_department_id())
  );

-- Sections (A/B/C, ...) nest under a Group — a Pre-Medical section and a
-- Computer Science section are different classes of students, confirmed
-- rather than assumed.
create table sections (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order int not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, code)
);

create index sections_department_idx on sections (department_id);
create index sections_group_idx on sections (group_id);

create trigger sections_set_updated_at
  before update on sections
  for each row execute function set_updated_at();

alter table sections enable row level security;

create policy "sections_select_authenticated" on sections
  for select to authenticated using (true);

-- Belt-and-suspenders: also verifies group_id's own department_id matches,
-- so a section can never be attached to a group from a different
-- department even by a caller who's otherwise authorized for department_id.
create policy "sections_write_admin_principal_focal" on sections
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and department_college_id(department_id) = current_college_id())
    or (
      current_user_role() = 'focal_person_intermediate'
      and department_id = current_department_id()
      and exists (select 1 from groups g where g.id = group_id and g.department_id = department_id)
    )
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and department_college_id(department_id) = current_college_id())
    or (
      current_user_role() = 'focal_person_intermediate'
      and department_id = current_department_id()
      and exists (select 1 from groups g where g.id = group_id and g.department_id = department_id)
    )
  );

-- Nullable everywhere: existing students/admissions (BS and Intermediate
-- alike) get NULL ("Unassigned"), never an invented value — no seed rows
-- for groups/sections themselves either, unlike Morning/Evening in 0072:
-- which 5 groups actually apply is real data only a human should enter.
alter table profiles add column group_id uuid references groups (id);
alter table profiles add column section_id uuid references sections (id);
alter table admissions add column group_id uuid references groups (id);
alter table admissions add column section_id uuid references sections (id);
