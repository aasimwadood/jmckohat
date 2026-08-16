-- Workflow audit fix (docs/WORKFLOW_AUDIT.md C1 / C7), part 3: RPCs.
--
-- 0046 fixed RLS, but every one of these functions is SECURITY DEFINER —
-- RLS never applies to them at all, so an unscoped role check inside the
-- function body is a real bypass regardless of what RLS says. Also closes
-- C7 in the same pass (register_for_promotion had no department-match
-- check at all for the department/faculty branch, unlike every other
-- function's pattern of re-checking scope, not just role).

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

create or replace function approve_admission_fee(p_admission_id uuid, p_receipt_number text)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
begin
  if current_user_role() <> 'administration' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;
  if department_college_id(v_admission.department_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
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
  if current_user_role() in ('department', 'faculty') and v_admission.department_id <> current_department_id() then
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

create or replace function verify_promotion_fee(p_promotion_id uuid, p_receipt_number text)
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
begin
  if current_user_role() <> 'administration' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;
  if profile_college_id(v_promotion.student_profile_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_promotion.status <> 'registration_complete' then
    raise exception 'invalid_status: promotion must be registration_complete, got %', v_promotion.status;
  end if;

  update promotions
  set status = 'promoted',
      fee_receipt_number = p_receipt_number,
      fee_verified_by = auth.uid(),
      fee_verified_at = now()
  where id = p_promotion_id
  returning * into v_promotion;

  update profiles set current_semester_id = v_promotion.to_semester_id
  where id = v_promotion.student_profile_id;

  return v_promotion;
end;
$$;

-- C7: register_for_promotion() previously checked only role, never that an
-- 'admin' caller's college or a 'department'/'faculty' caller's department
-- actually matched the promotion's student — any department/faculty
-- account could register courses on another department's student's
-- promotion via a direct RPC call.
create or replace function register_for_promotion(p_promotion_id uuid, p_course_ids uuid[])
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
  v_course_id uuid;
begin
  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;

  if v_promotion.student_profile_id <> auth.uid() then
    if current_user_role() = 'admin' then
      if profile_college_id(v_promotion.student_profile_id) <> current_college_id() then
        raise exception 'insufficient_privilege' using errcode = '42501';
      end if;
    elsif current_user_role() in ('department', 'faculty') then
      if (select department_id from profiles where id = v_promotion.student_profile_id) <> current_department_id() then
        raise exception 'insufficient_privilege' using errcode = '42501';
      end if;
    else
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  if v_promotion.status <> 'pending_registration' then
    raise exception 'invalid_status: promotion must be pending_registration, got %', v_promotion.status;
  end if;

  if array_length(p_course_ids, 1) is null or array_length(p_course_ids, 1) > v_promotion.max_courses then
    raise exception 'course_limit_exceeded: max % courses allowed', v_promotion.max_courses;
  end if;

  foreach v_course_id in array p_course_ids loop
    insert into enrollments (student_profile_id, course_id, semester_id, status)
    values (v_promotion.student_profile_id, v_course_id, v_promotion.to_semester_id, 'active')
    on conflict (student_profile_id, course_id, semester_id) do nothing;
  end loop;

  update promotions set status = 'registration_complete'
  where id = p_promotion_id
  returning * into v_promotion;

  return v_promotion;
end;
$$;
