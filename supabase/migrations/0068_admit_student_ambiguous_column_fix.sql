-- Real, pre-existing bug found live-verifying Fee Management Phase 2 (not
-- introduced by this feature — present verbatim since the original
-- 0005_admissions.sql and carried through 0047's college-scoping pass):
-- admit_student()'s semester lookup,
--   select id into v_semester_id from semesters s
--     join academic_sessions a on a.id = s.academic_session_id
--     where a.is_active = true and s.number = 1 limit 1;
-- selects unqualified `id` where BOTH joined tables have an `id` column —
-- genuinely ambiguous, and Postgres rejects it outright:
-- "column reference \"id\" is ambiguous". This isn't conditional on data;
-- every real call to admit_student() (the RPC behind "Confirm Admission")
-- has always failed, for every department, on every admission. Fixed by
-- qualifying the column — no other change to the function.

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
  if current_user_role() not in ('admin', 'department', 'faculty') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_user_role() = 'admin' and department_college_id(v_admission.department_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if current_user_role() = 'department' and v_admission.department_id <> current_department_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if current_user_role() = 'faculty' and v_admission.department_id <> current_department_id() then
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

  select s.id into v_semester_id from semesters s
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
