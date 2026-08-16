-- Proctorial Board: Chief Proctor / Staff Proctor are informational titles
-- (same category as Head of Department, QEC Focal Person, etc. from 0054)
-- — "who holds the title" is already fully solved by the existing
-- designation_types/designation_assignments tables and Principal UI, so
-- this migration only seeds the two new title types. What's genuinely new
-- is the operational layer: duty scheduling/status and complaints, which
-- nothing in the schema covers yet (support_tickets is a general
-- IT/facilities helpdesk queue, not proctorial duty/discipline).

insert into designation_types (name, scope) values
  ('Chief Proctor', 'college'),
  ('Staff Proctor', 'department');

-- Mirrors teaches_course() (0003): a SECURITY DEFINER boolean check so RLS
-- can gate on "currently holds this title" without re-triggering
-- designation_assignments' own RLS.
create or replace function is_chief_proctor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from designation_assignments da
    join designation_types dt on dt.id = da.designation_type_id
    where da.profile_id = auth.uid() and dt.name = 'Chief Proctor' and da.college_id = current_college_id()
  );
$$;

create or replace function is_staff_proctor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from designation_assignments da
    join designation_types dt on dt.id = da.designation_type_id
    where da.profile_id = auth.uid() and dt.name = 'Staff Proctor' and da.college_id = current_college_id()
  );
$$;

create table proctor_duties (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  assigned_to uuid not null references profiles (id) on delete cascade,
  duty_type text not null,
  duty_date date not null,
  shift_time text,
  location text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'missed', 'cancelled')),
  assigned_by uuid references profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index proctor_duties_college_idx on proctor_duties (college_id);
create index proctor_duties_assigned_to_idx on proctor_duties (assigned_to);

create table proctor_complaints (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete cascade,
  raised_by uuid not null references profiles (id) on delete cascade,
  against_student_id uuid references profiles (id) on delete set null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  reviewed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index proctor_complaints_college_idx on proctor_complaints (college_id);
create index proctor_complaints_raised_by_idx on proctor_complaints (raised_by);

alter table proctor_duties enable row level security;
alter table proctor_complaints enable row level security;

-- Duties: admin/principal/Chief Proctor see and assign everything at their
-- college; a Staff Proctor sees and can update only their own row (the
-- action layer only ever sends `status` on that self-update path — same
-- table-level-RLS-plus-app-discipline convention this app already uses
-- elsewhere, e.g. updateEnrollmentStatusAction).
create policy "proctor_duties_select_scoped" on proctor_duties
  for select to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
    or assigned_to = auth.uid()
  );

create policy "proctor_duties_insert_admin_principal_chief" on proctor_duties
  for insert to authenticated
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
  );

create policy "proctor_duties_update_scoped" on proctor_duties
  for update to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
    or assigned_to = auth.uid()
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
    or assigned_to = auth.uid()
  );

-- Complaints: Chief Proctor or any Staff Proctor can file one; visibility
-- and status changes (review/resolve) stay with admin/principal/Chief
-- Proctor plus the original filer seeing their own.
create policy "proctor_complaints_select_scoped" on proctor_complaints
  for select to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
    or raised_by = auth.uid()
  );

create policy "proctor_complaints_insert_proctors" on proctor_complaints
  for insert to authenticated
  with check (
    (is_chief_proctor() or is_staff_proctor())
    and college_id = current_college_id()
    and raised_by = auth.uid()
  );

create policy "proctor_complaints_update_scoped" on proctor_complaints
  for update to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
    or (is_chief_proctor() and college_id = current_college_id())
  );
