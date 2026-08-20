-- Shift Management, Phase 1: a real configurable Morning/Evening shift
-- concept (not a hardcoded enum — more shifts must be addable later
-- without a code change), shared by BS and Intermediate alike since
-- shift_id lives on the same profiles/admissions tables both use. Lays the
-- foundation for shift-linked fee voucher bank account selection; the
-- Intermediate academic structure (years/groups/sections) and the new
-- Focal Person role are later phases, not part of this migration.

create table shifts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order int not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, code)
);

create index shifts_college_idx on shifts (college_id);

create trigger shifts_set_updated_at
  before update on shifts
  for each row execute function set_updated_at();

alter table shifts enable row level security;

-- Readable by anyone authenticated — shift names need to display wherever
-- a student's info shows (admissions, promotions, vouchers), matching the
-- college_bank_accounts read posture.
create policy "shifts_select_authenticated" on shifts
  for select to authenticated using (true);

-- Writable by admin or principal, scoped to their own college. Narrower
-- than college_bank_accounts (which also allows administration) — shift
-- structure is an academic-configuration decision, not a finance one.
create policy "shifts_write_admin_principal" on shifts
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() = 'principal' and college_id = current_college_id())
  );

-- Seed Morning + Evening for the real college — the spec wants the system
-- usable immediately with these two, unlike bank account numbers which had
-- to come from a real person. Admins can add more shifts later through the
-- UI; nothing here hardcodes the concept to exactly two.
insert into shifts (college_id, name, code, sort_order)
select id, 'Morning', 'morning', 0 from colleges where code = 'GPGC-KOH'
union all
select id, 'Evening', 'evening', 1 from colleges where code = 'GPGC-KOH';

-- Nullable everywhere: existing students/admissions get NULL ("Unassigned"),
-- never an invented value.
alter table profiles add column shift_id uuid references shifts (id);
alter table admissions add column shift_id uuid references shifts (id);

-- NULL on a bank account means "general account, not shift-specific" — the
-- fallback every student's voucher can show regardless of their own shift.
alter table college_bank_accounts add column shift_id uuid references shifts (id);
create index college_bank_accounts_shift_idx on college_bank_accounts (shift_id);

-- admissions has no blanket UPDATE policy (admissions_update_admin_only,
-- 0005_admissions.sql — department/faculty status changes only ever go
-- through SECURITY DEFINER RPCs that re-check the caller's role). Shift
-- assignment on an existing admission row needs the same treatment rather
-- than a plain client-side .update(), matching admit_student/cancel_admission.
create or replace function assign_admission_shift(p_admission_id uuid, p_shift_id uuid)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_college_id uuid;
begin
  if current_user_role() not in ('admin', 'department', 'faculty') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_user_role() in ('department', 'faculty') and v_admission.department_id <> current_department_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  v_college_id := department_college_id(v_admission.department_id);
  if current_user_role() = 'admin' and v_college_id <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if p_shift_id is not null and not exists (select 1 from shifts where id = p_shift_id and college_id = v_college_id) then
    raise exception 'shift_not_in_college';
  end if;

  update admissions set shift_id = p_shift_id where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;
