-- Shift Management, Phase 2: thread the new focal_person_intermediate role
-- into exactly the RLS policies/RPCs its confirmed authority (admissions,
-- promotions, results-viewing, fee workflows, shift assignment) requires —
-- each based on that object's current authoritative definition (several
-- have been redefined more than once; verified by grep before writing this,
-- not assumed from the original migration). Deliberately NOT touched: fee
-- approval/finalization (approve_admission_fee, verify_promotion_fee,
-- manually_clear_*, manually_resolve_fee_voucher, upsert_fee_structure —
-- administration/admin-only, matching what 'department' already can't do
-- either), raw grade-entry (results_write_faculty_own_course — a
-- teaches_course() faculty-teaching-load concept), attendance, FYP,
-- course materials/assignments/timetable/curriculum/designations, and
-- admissions_update_admin_only (admin-only by design; every other role,
-- 'department' included, goes through SECURITY DEFINER RPCs, never a
-- direct UPDATE — focal_person_intermediate follows that same rule, not
-- an exception to it). fee_voucher_components_select_scoped (0066) needs
-- no change either — it delegates entirely to fee_vouchers' own SELECT
-- policy rather than checking a role itself.

-- RPCs ----------------------------------------------------------------

-- admit_student(): current source 0068_admit_student_ambiguous_column_fix.sql
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
  if current_user_role() not in ('admin', 'department', 'faculty', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_user_role() = 'admin' and department_college_id(v_admission.department_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if current_user_role() in ('department', 'faculty', 'focal_person_intermediate')
     and v_admission.department_id <> current_department_id() then
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

-- cancel_admission(): current source 0047_legacy_college_scoping_rpc_fixes.sql
create or replace function cancel_admission(p_admission_id uuid, p_reason text)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
begin
  if current_user_role() not in ('admin', 'department', 'faculty', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;
  if current_user_role() = 'admin' and department_college_id(v_admission.department_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if current_user_role() in ('department', 'faculty', 'focal_person_intermediate')
     and v_admission.department_id <> current_department_id() then
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

-- register_for_promotion(): current source 0047_legacy_college_scoping_rpc_fixes.sql
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
    elsif current_user_role() in ('department', 'faculty', 'focal_person_intermediate') then
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

-- assign_admission_shift(): current source 0072_shifts.sql
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
  if current_user_role() not in ('admin', 'department', 'faculty', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_user_role() in ('department', 'faculty', 'focal_person_intermediate')
     and v_admission.department_id <> current_department_id() then
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

-- generate_fee_voucher(): current source 0061_fee_structures_and_vouchers.sql
-- (only 'department', never 'faculty', could generate a promotion-linked
-- voucher — preserved exactly, only the new role is added alongside it)
create or replace function generate_fee_voucher(p_promotion_id uuid)
returns fee_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
  v_program_id uuid;
  v_semester_number int;
  v_academic_session_id uuid;
  v_structure fee_structures;
  v_voucher fee_vouchers;
  v_year int;
  v_seq int;
  v_component record;
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
    elsif current_user_role() in ('department', 'focal_person_intermediate') then
      if (select department_id from profiles where id = v_promotion.student_profile_id) <> current_department_id() then
        raise exception 'insufficient_privilege' using errcode = '42501';
      end if;
    else
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  if v_promotion.status <> 'fee_pending' then
    raise exception 'invalid_status: promotion must be fee_pending, got %', v_promotion.status;
  end if;

  select program_id into v_program_id from profiles where id = v_promotion.student_profile_id;

  select s.number, s.academic_session_id into v_semester_number, v_academic_session_id
  from semesters s where s.id = v_promotion.to_semester_id;

  select * into v_structure from fee_structures
  where program_id = v_program_id
    and semester_number = v_semester_number
    and academic_session_id = v_academic_session_id
    and status = 'active';
  if not found then
    raise exception 'no_fee_structure_configured';
  end if;

  v_year := extract(year from now())::int;
  insert into fee_voucher_counters (academic_year, last_seq)
  values (v_year, 1)
  on conflict (academic_year)
  do update set last_seq = fee_voucher_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into fee_vouchers (
    voucher_number, promotion_id, student_profile_id, fee_structure_id,
    total_amount, status, due_date, generated_by
  ) values (
    'GPGC-FEE-' || v_year || '-' || lpad(v_seq::text, 4, '0'),
    p_promotion_id, v_promotion.student_profile_id, v_structure.id,
    v_structure.total_amount, 'unpaid', (now() + interval '14 days')::date, auth.uid()
  ) returning * into v_voucher;

  for v_component in select name, amount, sort_order from fee_structure_components where fee_structure_id = v_structure.id loop
    insert into fee_voucher_components (fee_voucher_id, name, amount, sort_order)
    values (v_voucher.id, v_component.name, v_component.amount, v_component.sort_order);
  end loop;

  return v_voucher;
end;
$$;

-- generate_admission_fee_voucher(): current source 0066_admission_fee_vouchers.sql
create or replace function generate_admission_fee_voucher(p_admission_id uuid)
returns fee_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_semester_id uuid;
  v_academic_session_id uuid;
  v_structure fee_structures;
  v_voucher fee_vouchers;
  v_year int;
  v_seq int;
  v_component record;
begin
  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_user_role() = 'admin' then
    if department_college_id(v_admission.department_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif current_user_role() in ('department', 'faculty', 'focal_person_intermediate') then
    if v_admission.department_id <> current_department_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_admission.status <> 'pending' then
    raise exception 'invalid_status: admission must be pending, got %', v_admission.status;
  end if;
  if v_admission.program_id is null then
    raise exception 'admission_has_no_program_assigned';
  end if;

  select s.id, s.academic_session_id into v_semester_id, v_academic_session_id
  from semesters s join academic_sessions a on a.id = s.academic_session_id
  where a.is_active = true and s.number = 1
  limit 1;
  if v_semester_id is null then
    raise exception 'no_active_semester_one';
  end if;

  select * into v_structure from fee_structures
  where program_id = v_admission.program_id
    and semester_number = 1
    and academic_session_id = v_academic_session_id
    and status = 'active';
  if not found then
    raise exception 'no_fee_structure_configured';
  end if;

  v_year := extract(year from now())::int;
  insert into fee_voucher_counters (academic_year, last_seq)
  values (v_year, 1)
  on conflict (academic_year)
  do update set last_seq = fee_voucher_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into fee_vouchers (
    voucher_number, admission_id, student_profile_id, fee_structure_id,
    total_amount, status, due_date, generated_by
  ) values (
    'GPGC-FEE-' || v_year || '-' || lpad(v_seq::text, 4, '0'),
    p_admission_id, v_admission.student_profile_id, v_structure.id,
    v_structure.total_amount, 'unpaid', (now() + interval '14 days')::date, auth.uid()
  ) returning * into v_voucher;

  for v_component in select name, amount, sort_order from fee_structure_components where fee_structure_id = v_structure.id loop
    insert into fee_voucher_components (fee_voucher_id, name, amount, sort_order)
    values (v_voucher.id, v_component.name, v_component.amount, v_component.sort_order);
  end loop;

  return v_voucher;
end;
$$;

-- RLS policies ----------------------------------------------------------

-- admissions_select_scoped: current source 0046_legacy_college_scoping_rls.sql
drop policy "admissions_select_scoped" on admissions;
create policy "admissions_select_scoped" on admissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and department_college_id(department_id) = current_college_id()
    )
    or (current_user_role() in ('department', 'faculty', 'focal_person_intermediate') and department_id = current_department_id())
    or department_visible_to_org_admin(department_id)
  );

-- admissions_insert_department_or_faculty: current source 0005_admissions.sql
drop policy "admissions_insert_department_or_faculty" on admissions;
create policy "admissions_insert_department_or_faculty" on admissions
  for insert to authenticated
  with check (
    current_user_role() = 'admin'
    or (current_user_role() in ('department', 'faculty', 'focal_person_intermediate') and department_id = current_department_id())
  );

-- admission_settings_write_department_or_admin: current source 0005_admissions.sql
drop policy "admission_settings_write_department_or_admin" on admission_settings;
create policy "admission_settings_write_department_or_admin" on admission_settings
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() in ('department', 'focal_person_intermediate') and department_id = current_department_id())
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() in ('department', 'focal_person_intermediate') and department_id = current_department_id())
  );

-- admission_documents_select_scoped: current source 0046_legacy_college_scoping_rls.sql
drop policy "admission_documents_select_scoped" on admission_documents;
create policy "admission_documents_select_scoped" on admission_documents
  for select to authenticated
  using (
    exists (
      select 1 from admissions ad where ad.id = admission_id and (
        ad.student_profile_id = auth.uid()
        or (
          current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
          and department_college_id(ad.department_id) = current_college_id()
        )
        or (current_user_role() in ('department', 'faculty', 'focal_person_intermediate') and ad.department_id = current_department_id())
      )
    )
  );

-- admission_documents_write_department_or_faculty: current source 0046_legacy_college_scoping_rls.sql
drop policy "admission_documents_write_department_or_faculty" on admission_documents;
create policy "admission_documents_write_department_or_faculty" on admission_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from admissions ad where ad.id = admission_id and (
        (current_user_role() = 'admin' and department_college_id(ad.department_id) = current_college_id())
        or (current_user_role() in ('department', 'faculty', 'focal_person_intermediate') and ad.department_id = current_department_id())
      )
    )
  );

-- promotions_select_scoped: current source 0046_legacy_college_scoping_rls.sql
drop policy "promotions_select_scoped" on promotions;
create policy "promotions_select_scoped" on promotions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and profile_college_id(student_profile_id) = current_college_id()
    )
    or (
      current_user_role() in ('department', 'faculty', 'focal_person_intermediate')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );

-- promotions_insert_admin_or_department: current source 0046_legacy_college_scoping_rls.sql
drop policy "promotions_insert_admin_or_department" on promotions;
create policy "promotions_insert_admin_or_department" on promotions
  for insert to authenticated
  with check (
    (current_user_role() = 'admin' and profile_college_id(student_profile_id) = current_college_id())
    or (
      current_user_role() in ('department', 'focal_person_intermediate')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
  );

-- fee_payments_select_scoped: current source 0046_legacy_college_scoping_rls.sql
drop policy "fee_payments_select_scoped" on fee_payments;
create policy "fee_payments_select_scoped" on fee_payments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and profile_college_id(student_profile_id) = current_college_id()
    )
    or (
      current_user_role() in ('department', 'focal_person_intermediate')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );

-- fee_vouchers_select_scoped: current source 0069_fee_vouchers_admission_org_admin_visibility.sql
drop policy "fee_vouchers_select_scoped" on fee_vouchers;
create policy "fee_vouchers_select_scoped" on fee_vouchers
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and (
        (student_profile_id is not null and profile_college_id(student_profile_id) = current_college_id())
        or (admission_id is not null and exists (
          select 1 from admissions ad where ad.id = admission_id and department_college_id(ad.department_id) = current_college_id()
        ))
      )
    )
    or (
      current_user_role() in ('department', 'faculty', 'focal_person_intermediate')
      and (
        (student_profile_id is not null and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id()))
        or (admission_id is not null and exists (select 1 from admissions ad where ad.id = admission_id and ad.department_id = current_department_id()))
      )
    )
    or (student_profile_id is not null and profile_visible_to_org_admin(student_profile_id))
    or (admission_id is not null and exists (
      select 1 from admissions ad where ad.id = admission_id and department_visible_to_org_admin(ad.department_id)
    ))
  );

-- results_select_own_or_scoped: current source 0046_legacy_college_scoping_rls.sql
-- (results are tied to courses, not profiles/admissions directly — Focal
-- Person's "results" authority is view-only, matching what this policy
-- already grants 'department'; results_write_faculty_own_course, a
-- teaches_course() faculty-teaching-load concept, is untouched)
drop policy "results_select_own_or_scoped" on results;
create policy "results_select_own_or_scoped" on results
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or (
      current_user_role() in ('admin', 'principal', 'controller', 'college_admin')
      and course_college_id(course_id) = current_college_id()
    )
    or (
      current_user_role() in ('department', 'focal_person_intermediate')
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );
