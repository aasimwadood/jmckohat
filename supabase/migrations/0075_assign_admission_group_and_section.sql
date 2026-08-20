-- admissions has no blanket client-side UPDATE policy (admissions_update_
-- admin_only, 0046_legacy_college_scoping_rls.sql — department/faculty
-- field changes only ever go through SECURITY DEFINER RPCs that re-check
-- the caller's role). Group/Section assignment needs the same treatment,
-- exactly mirroring assign_admission_shift() (0072_shifts.sql). Combined
-- into one RPC rather than two separate ones so a section can never be set
-- inconsistently with its group.
create or replace function assign_admission_placement(p_admission_id uuid, p_group_id uuid, p_section_id uuid)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_college_id uuid;
  v_group_department_id uuid;
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

  if p_group_id is not null then
    select department_id into v_group_department_id from groups where id = p_group_id;
    if v_group_department_id is null or v_group_department_id <> v_admission.department_id then
      raise exception 'group_not_in_department';
    end if;
  end if;

  if p_section_id is not null then
    if p_group_id is null or not exists (select 1 from sections where id = p_section_id and group_id = p_group_id) then
      raise exception 'section_not_in_group';
    end if;
  end if;

  update admissions set group_id = p_group_id, section_id = p_section_id where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;
