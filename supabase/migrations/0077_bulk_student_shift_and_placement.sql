-- Shift Management, Phase 3: bulk shift/group/section assignment for
-- already-enrolled students (profiles rows), not just admissions. profiles
-- has a column-restricted UPDATE grant (0002_profiles_and_orgs.sql —
-- `grant update (full_name, phone, avatar_path) on profiles to
-- authenticated`), so shift_id/group_id/section_id can only ever change
-- through a SECURITY DEFINER RPC, the same constraint that shaped
-- assign_admission_shift()/assign_admission_placement() in Phases 1-2.
-- Both RPCs below are all-or-nothing: if any id in p_student_ids doesn't
-- belong to the caller's own department, the whole call is rejected and
-- nothing is updated — fail-closed, not a partial/best-effort apply.

create or replace function bulk_assign_student_shift(p_student_ids uuid[], p_shift_id uuid)
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_college_id uuid;
begin
  if current_user_role() not in ('admin', 'department', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if current_user_role() in ('department', 'focal_person_intermediate') then
    if exists (select 1 from profiles where id = any(p_student_ids) and department_id <> current_department_id()) then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    if exists (
      select 1 from profiles where id = any(p_student_ids) and department_college_id(department_id) <> current_college_id()
    ) then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;
  v_college_id := current_college_id();

  if p_shift_id is not null and not exists (select 1 from shifts where id = p_shift_id and college_id = v_college_id) then
    raise exception 'shift_not_in_college';
  end if;

  return query
    update profiles set shift_id = p_shift_id where id = any(p_student_ids)
    returning *;
end;
$$;

create or replace function bulk_assign_student_placement(p_student_ids uuid[], p_group_id uuid, p_section_id uuid)
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_department_id uuid;
  v_group_department_id uuid;
begin
  if current_user_role() not in ('admin', 'department', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- A group belongs to exactly one department, so every selected student
  -- must share the same department — not merely the same college — or
  -- group_id validation below would be meaningless for a mixed selection.
  if (select count(distinct department_id) from profiles where id = any(p_student_ids)) <> 1 then
    raise exception 'students_span_multiple_departments';
  end if;
  select department_id into v_department_id from profiles where id = p_student_ids[1];

  if current_user_role() in ('department', 'focal_person_intermediate') then
    if v_department_id <> current_department_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    if department_college_id(v_department_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  if p_group_id is not null then
    select department_id into v_group_department_id from groups where id = p_group_id;
    if v_group_department_id is null or v_group_department_id <> v_department_id then
      raise exception 'group_not_in_department';
    end if;
  end if;

  if p_section_id is not null then
    if p_group_id is null or not exists (select 1 from sections where id = p_section_id and group_id = p_group_id) then
      raise exception 'section_not_in_group';
    end if;
  end if;

  return query
    update profiles set group_id = p_group_id, section_id = p_section_id where id = any(p_student_ids)
    returning *;
end;
$$;
