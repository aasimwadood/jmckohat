-- You asked: department heads, coordinators, and controllers who also
-- teach a real course should get full faculty-menu access (attendance,
-- assignments, materials, marks, course-file reports, FYP supervision),
-- not just their own role's dashboard.
--
-- The SELECT side of this already worked: assignments_select_enrolled_or_scoped,
-- materials_select_enrolled_or_scoped, results_select_own_or_scoped, and
-- attendance_select_scoped (0046) all grant read via a bare `teaches_course(course_id)`
-- branch with no role restriction — anyone with a real course_faculty row
-- can already see it, regardless of their profiles.role. Only the WRITE
-- policies (and 3 FYP supervision RPCs) hard-require
-- `current_user_role() = 'faculty'` specifically. Since teaches_course()
-- itself is the real boundary (an actual course_faculty row, not just a
-- role claim), broadening the role check to include department/
-- coordinator/controller doesn't grant these roles anything beyond
-- courses they're genuinely assigned to teach — it does not touch their
-- existing admin-style access to their own resources at all.

drop policy "assignments_write_faculty_own_course" on assignments;
create policy "assignments_write_faculty_own_course" on assignments
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  );

drop policy "materials_write_faculty_own_course" on course_materials;
create policy "materials_write_faculty_own_course" on course_materials
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  );

drop policy "results_write_faculty_own_course" on results;
create policy "results_write_faculty_own_course" on results
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  );

drop policy "attendance_write_faculty_own_course" on attendance;
create policy "attendance_write_faculty_own_course" on attendance
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  );

drop policy "course_file_reports_write_faculty_own_course" on course_file_reports;
create policy "course_file_reports_write_faculty_own_course" on course_file_reports
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() in ('faculty', 'department', 'coordinator', 'controller') and teaches_course(course_id))
  );

-- FYP: the 3 supervision RPCs (0048/0049) hard-required role = 'faculty'.
-- A teaching department head/coordinator/controller can now also be named
-- as a supervisor and act on their own supervised groups — still gated by
-- actually being that group's supervisor_profile_id, same as before.
create or replace function create_fyp_group(
  p_department_id uuid,
  p_semester_id uuid,
  p_member_ids uuid[],
  p_supervisor_profile_id uuid,
  p_title text default null
)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config fyp_semester_config;
  v_group fyp_groups;
  v_member_id uuid;
  v_assigned int;
begin
  if current_user_role() <> 'student' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if not exists (
    select 1 from profiles
    where id = p_supervisor_profile_id
      and role in ('faculty', 'department', 'coordinator', 'controller')
      and department_id = p_department_id
  ) then
    raise exception 'invalid_supervisor: must be a faculty member in this department';
  end if;

  select * into v_config from fyp_semester_config
    where department_id = p_department_id and semester_id = p_semester_id;
  if not found or not v_config.is_enabled then
    raise exception 'fyp_not_enabled_for_semester';
  end if;

  if exists (
    select 1 from fyp_members m
    join fyp_groups g on g.id = m.fyp_group_id
    where m.student_profile_id = auth.uid()
      and g.semester_id = p_semester_id
      and g.status not in ('archived')
  ) then
    raise exception 'already_in_a_group_this_semester';
  end if;

  if array_length(p_member_ids, 1) is not null and array_length(p_member_ids, 1) > v_config.max_members then
    raise exception 'group_size_exceeded: max % additional members', v_config.max_members;
  end if;

  select count(*) into v_assigned from fyp_groups
    where supervisor_profile_id = p_supervisor_profile_id
      and semester_id = p_semester_id
      and status <> 'archived';
  if v_assigned >= v_config.supervisor_quota then
    raise exception 'supervisor_quota_exceeded';
  end if;

  insert into fyp_groups (department_id, semester_id, title, supervisor_profile_id, created_by)
  values (p_department_id, p_semester_id, p_title, p_supervisor_profile_id, auth.uid())
  returning * into v_group;

  insert into fyp_members (fyp_group_id, student_profile_id, is_leader)
  values (v_group.id, auth.uid(), true);

  if p_member_ids is not null then
    foreach v_member_id in array p_member_ids loop
      insert into fyp_members (fyp_group_id, student_profile_id, is_leader)
      values (v_group.id, v_member_id, false)
      on conflict do nothing;
    end loop;
  end if;

  return v_group;
end;
$$;

create or replace function respond_to_fyp_supervision(p_group_id uuid, p_approve boolean)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group fyp_groups;
begin
  if current_user_role() not in ('faculty', 'department', 'coordinator', 'controller') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_group from fyp_groups where id = p_group_id for update;
  if not found then
    raise exception 'group_not_found';
  end if;
  if v_group.supervisor_profile_id <> auth.uid() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_group.status <> 'supervisor_pending' then
    raise exception 'invalid_status: group must be supervisor_pending, got %', v_group.status;
  end if;

  update fyp_groups
  set status = case when p_approve then 'proposal_pending'::fyp_group_status else 'supervisor_pending'::fyp_group_status end,
      supervisor_profile_id = case when p_approve then supervisor_profile_id else null end
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

create or replace function review_fyp_proposal(p_proposal_id uuid, p_approve boolean, p_remarks text default null)
returns fyp_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal fyp_proposals;
  v_group fyp_groups;
begin
  if current_user_role() not in ('faculty', 'department', 'coordinator', 'controller') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_proposal from fyp_proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposal_not_found';
  end if;

  select * into v_group from fyp_groups where id = v_proposal.fyp_group_id for update;
  if v_group.supervisor_profile_id <> auth.uid() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_proposal.status <> 'submitted' then
    raise exception 'invalid_status: proposal must be submitted, got %', v_proposal.status;
  end if;
  if v_group.status <> 'proposal_pending' then
    raise exception 'invalid_status: group must be proposal_pending, got %', v_group.status;
  end if;

  update fyp_proposals
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_proposal_id
  returning * into v_proposal;

  if p_approve then
    update fyp_groups set status = 'proposal_approved' where id = v_group.id;
  end if;

  return v_proposal;
end;
$$;

create or replace function advance_fyp_stage(p_group_id uuid, p_target_status fyp_group_status)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group fyp_groups;
  v_sequence fyp_group_status[] := array['proposal_approved', 'in_progress', 'mid_semester_review', 'final_submission', 'completed'];
  v_current_idx int;
  v_target_idx int;
begin
  if current_user_role() not in ('faculty', 'department', 'coordinator', 'controller') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_group from fyp_groups where id = p_group_id for update;
  if not found then
    raise exception 'group_not_found';
  end if;
  if v_group.supervisor_profile_id <> auth.uid() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select array_position(v_sequence, v_group.status) into v_current_idx;
  select array_position(v_sequence, p_target_status) into v_target_idx;

  if v_current_idx is null or v_target_idx is null or v_target_idx <> v_current_idx + 1 then
    raise exception 'invalid_transition: cannot move from % to %', v_group.status, p_target_status;
  end if;

  update fyp_groups set status = p_target_status where id = p_group_id returning * into v_group;
  return v_group;
end;
$$;
