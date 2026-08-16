-- Principal- and HOD-managed administrative designations (focal persons,
-- BS/Inter coordinators & controllers, etc.) — informational titles, not
-- new system roles. None of these carry any RLS/functional permission
-- anywhere else in the schema; they're the same category as the existing
-- departments.hod_profile_id (kept as-is, not migrated into this table, so
-- the Principal's Departmental Reports page keeps reading it unchanged).

create table designation_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null check (scope in ('college', 'department')),
  created_at timestamptz not null default now(),
  unique (name, scope)
);

create table designation_assignments (
  id uuid primary key default gen_random_uuid(),
  designation_type_id uuid not null references designation_types (id) on delete cascade,
  college_id uuid not null references colleges (id) on delete cascade,
  department_id uuid references departments (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  assigned_by uuid references profiles (id),
  assigned_at timestamptz not null default now()
);

create index designation_assignments_type_idx on designation_assignments (designation_type_id);
create index designation_assignments_college_idx on designation_assignments (college_id);
create index designation_assignments_department_idx on designation_assignments (department_id);

-- One holder at a time per (type, college) for college-scope rows, and per
-- (type, department) for department-scope rows. Two partial unique indexes
-- since a single `unique` constraint can't express "null department_id
-- means dedupe on college_id alone, non-null means dedupe on department_id
-- alone" — the app layer (setDesignationAssignmentAction) still does a
-- select-then-update-or-insert rather than relying on upsert against these,
-- since PostgREST's onConflict target can't express a partial index.
create unique index designation_assignments_college_scope_unique_idx
  on designation_assignments (designation_type_id, college_id) where department_id is null;
create unique index designation_assignments_department_scope_unique_idx
  on designation_assignments (designation_type_id, department_id) where department_id is not null;

alter table designation_types enable row level security;
alter table designation_assignments enable row level security;

create policy "designation_types_select_authenticated" on designation_types
  for select to authenticated using (true);
create policy "designation_types_write_admin_or_principal" on designation_types
  for all to authenticated
  using (current_user_role() in ('admin', 'principal'))
  with check (current_user_role() in ('admin', 'principal'));

create policy "designation_assignments_select_scoped" on designation_assignments
  for select to authenticated using (college_id = current_college_id() or current_user_role() = 'admin');

create policy "designation_assignments_write_scoped" on designation_assignments
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (
      current_user_role() = 'department'
      and department_id is not null
      and department_id = current_department_id()
    )
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (
      current_user_role() = 'department'
      and department_id is not null
      and department_id = current_department_id()
    )
  );

-- Seed catalog from the Principal's own list. College-scope items apply
-- once per college; "Internship Focal Person" is seeded twice deliberately
-- (once college-scope, once department-scope) since a college can want
-- both a college-wide and a per-department contact.
insert into designation_types (name, scope) values
  ('Coordinator (BS)', 'college'),
  ('Controller (BS)', 'college'),
  ('Coordinator (Inter)', 'college'),
  ('Controller (Inter)', 'college'),
  ('QEC Focal Person', 'college'),
  ('Scholarship Focal Person', 'college'),
  ('MIS Focal Person', 'college'),
  ('Inter Admission Focal Person', 'college'),
  ('BS Admission Focal Person', 'college'),
  ('Internship Focal Person', 'college'),
  ('Attendance Focal Person', 'college'),
  ('Internship Focal Person', 'department');
