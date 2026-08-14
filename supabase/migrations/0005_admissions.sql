-- Per-session admission toggle (legacy: "AdmissionManagement settings" —
-- HoD enables/disables admissions per department per academic session).
create table admission_settings (
  department_id uuid not null references departments (id) on delete cascade,
  academic_session_id uuid not null references academic_sessions (id) on delete cascade,
  is_enabled boolean not null default false,
  enabled_by uuid references profiles (id),
  enabled_at timestamptz,
  primary key (department_id, academic_session_id)
);

-- Fixed 7-item merit category enum, preserved from the legacy UI.
create type merit_category as enum (
  'open_merit',
  'local_area',
  'special_merit',
  'sports_quota',
  'college_employee_child',
  'minority_quota',
  'disabled_person_quota'
);

create table admissions (
  id uuid primary key default gen_random_uuid(),
  temporary_id text not null unique,      -- pre-registration reference shown to applicant
  full_name text not null,
  cnic text,
  contact_number text,
  email text,
  department_id uuid not null references departments (id),
  program_id uuid references programs (id),
  merit_category merit_category not null default 'open_merit',
  merit_number int,
  status admission_status not null default 'pending',
  -- fee line items, PKR — defaults match the legacy `defaultFees` constant
  registration_fee numeric not null default 5000,
  crf_fee numeric not null default 3000,
  admission_fee numeric not null default 10000,
  tuition_fee numeric not null default 15000,
  examination_fee numeric not null default 4000,
  hostel_fee numeric not null default 0,
  transport_fee numeric not null default 0,
  fee_receipt_number text,
  fee_paid_at timestamptz,
  fee_approved_by uuid references profiles (id),
  registration_number text unique,        -- assigned atomically on admit, see admit_student()
  semester_id uuid references semesters (id),
  created_by uuid not null references profiles (id),
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  canceled_by uuid references profiles (id),
  canceled_at timestamptz,
  cancel_reason text,
  student_profile_id uuid references profiles (id), -- linked once the applicant has an account
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admissions_department_idx on admissions (department_id);
create index admissions_status_idx on admissions (status);
create index admissions_student_profile_idx on admissions (student_profile_id);

create trigger admissions_set_updated_at
  before update on admissions
  for each row execute function set_updated_at();

-- Atomic per-department, per-year sequence backing registration numbers.
create table registration_counters (
  department_id uuid not null references departments (id) on delete cascade,
  academic_year int not null,
  last_seq int not null default 0,
  primary key (department_id, academic_year)
);

create table admission_documents (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid not null references admissions (id) on delete cascade,
  label text not null,
  file_path text not null,       -- Storage object path in the "admission-documents" bucket
  uploaded_by uuid references profiles (id),
  uploaded_at timestamptz not null default now()
);

create index admission_documents_admission_idx on admission_documents (admission_id);

-- Business logic, moved server-side ---------------------------------------
-- The legacy frontend generated `GPCK-{year}-{DEPTCODE}-{seq}` in the
-- browser, which is both a race condition (two concurrent admits could
-- collide) and a trust problem (client-computed values in a write). This
-- function does it atomically and is the only path that can move an
-- admission from fee_approved -> admitted.

create or replace function admit_student(p_admission_id uuid)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_dept_code text;
  v_year int;
  v_seq int;
  v_semester_id uuid;
begin
  if current_role() not in ('admin', 'department', 'faculty') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_role() = 'department' and v_admission.department_id <> current_department_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if current_role() = 'faculty' and v_admission.department_id <> current_department_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_admission.status <> 'fee_approved' then
    raise exception 'invalid_status: admission must be fee_approved to admit, got %', v_admission.status;
  end if;

  select code into v_dept_code from departments where id = v_admission.department_id;
  v_year := extract(year from now())::int;

  insert into registration_counters (department_id, academic_year, last_seq)
  values (v_admission.department_id, v_year, 1)
  on conflict (department_id, academic_year)
  do update set last_seq = registration_counters.last_seq + 1
  returning last_seq into v_seq;

  select id into v_semester_id from semesters s
    join academic_sessions a on a.id = s.academic_session_id
    where a.is_active = true and s.number = 1
    limit 1;

  update admissions
  set status = 'admitted',
      registration_number = 'GPCK-' || v_year || '-' || upper(v_dept_code) || '-' || lpad(v_seq::text, 3, '0'),
      semester_id = v_semester_id,
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;

-- Fee verification: only administration (accountant) role. Transitions
-- pending -> fee_approved; does NOT admit (that remains a separate,
-- HoD/faculty-triggered step, matching the legacy two-step workflow).
create or replace function approve_admission_fee(p_admission_id uuid, p_receipt_number text)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
begin
  if current_role() <> 'administration' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;
  if v_admission.status <> 'pending' then
    raise exception 'invalid_status: admission must be pending to approve fee, got %', v_admission.status;
  end if;

  update admissions
  set status = 'fee_approved',
      fee_receipt_number = p_receipt_number,
      fee_paid_at = now(),
      fee_approved_by = auth.uid()
  where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;

create or replace function cancel_admission(p_admission_id uuid, p_reason text)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
begin
  if current_role() not in ('admin', 'department', 'faculty') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;
  if current_role() in ('department', 'faculty') and v_admission.department_id <> current_department_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update admissions
  set status = 'canceled',
      canceled_by = auth.uid(),
      canceled_at = now(),
      cancel_reason = p_reason
  where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;

-- RLS ---------------------------------------------------------------------

alter table admission_settings enable row level security;
alter table admissions enable row level security;
alter table admission_documents enable row level security;
alter table registration_counters enable row level security;

create policy "admission_settings_select_authenticated" on admission_settings
  for select to authenticated using (true);
create policy "admission_settings_write_department_or_admin" on admission_settings
  for all to authenticated
  using (current_role() = 'admin' or (current_role() = 'department' and department_id = current_department_id()))
  with check (current_role() = 'admin' or (current_role() = 'department' and department_id = current_department_id()));

create policy "admissions_select_scoped" on admissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or current_role() in ('admin', 'principal', 'administration')
    or (current_role() in ('department', 'faculty') and department_id = current_department_id())
  );
create policy "admissions_insert_department_or_faculty" on admissions
  for insert to authenticated
  with check (
    current_role() = 'admin'
    or (current_role() in ('department', 'faculty') and department_id = current_department_id())
  );
-- No blanket UPDATE policy: status transitions only happen through
-- admit_student / approve_admission_fee / cancel_admission above, which run
-- as SECURITY DEFINER and re-check the caller's role internally. This
-- closes off arbitrary field edits (e.g. a faculty account directly
-- setting registration_number) via PostgREST.
create policy "admissions_update_admin_only" on admissions
  for update to authenticated
  using (current_role() = 'admin')
  with check (current_role() = 'admin');

create policy "admission_documents_select_scoped" on admission_documents
  for select to authenticated
  using (
    exists (
      select 1 from admissions ad where ad.id = admission_id and (
        ad.student_profile_id = auth.uid()
        or current_role() in ('admin', 'principal', 'administration')
        or (current_role() in ('department', 'faculty') and ad.department_id = current_department_id())
      )
    )
  );
create policy "admission_documents_write_department_or_faculty" on admission_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from admissions ad where ad.id = admission_id and (
        current_role() = 'admin'
        or (current_role() in ('department', 'faculty') and ad.department_id = current_department_id())
      )
    )
  );

create policy "registration_counters_no_client_access" on registration_counters
  for all to authenticated
  using (false)
  with check (false);
