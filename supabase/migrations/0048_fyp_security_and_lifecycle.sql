-- Workflow audit fix (docs/WORKFLOW_AUDIT.md C3-C6): FYP security gaps and
-- lifecycle completion.
--
-- C3a: create_fyp_group() never validated p_supervisor_profile_id at all —
-- any UUID could be named as supervisor, including a student or an
-- unrelated faculty member in another department.
-- C3b: respond_to_fyp_supervision() checked only that the caller matched
-- supervisor_profile_id, never the caller's actual role — combined with
-- C3a, a student could name themselves their own supervisor and
-- self-approve via a direct RPC call, bypassing the requireRole("faculty")
-- check that only exists in the Next.js action layer.
-- C4: fyp_evaluations had no upper bound beyond score >= 0.
-- C5: 5 of 8 fyp_group_status values had no function anywhere that ever
-- set them — no group could progress past initial proposal submission.
-- C6: a supervisor decline correctly reset supervisor_profile_id to null
-- but left the group active, and the "form a group" UI only shows when a
-- student has no active group — permanently stuck with no recovery path.

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
    where id = p_supervisor_profile_id and role = 'faculty' and department_id = p_department_id
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
  if current_user_role() <> 'faculty' then
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
  set status = case when p_approve then 'proposal_pending' else 'supervisor_pending' end,
      supervisor_profile_id = case when p_approve then supervisor_profile_id else null end
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

-- C6: lets the group's own leader bail out of a dead-end (declined, or
-- never-approved) group and immediately become eligible to form a new one
-- — create_fyp_group()'s own duplicate-group check already excludes
-- archived groups, so this alone closes the loop.
create or replace function withdraw_fyp_group(p_group_id uuid)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group fyp_groups;
begin
  if current_user_role() <> 'student' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if not exists (
    select 1 from fyp_members where fyp_group_id = p_group_id and student_profile_id = auth.uid() and is_leader
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_group from fyp_groups where id = p_group_id for update;
  if not found then
    raise exception 'group_not_found';
  end if;
  if v_group.status <> 'supervisor_pending' then
    raise exception 'invalid_status: can only withdraw a group still awaiting supervisor approval, got %', v_group.status;
  end if;

  update fyp_groups set status = 'archived' where id = p_group_id returning * into v_group;
  return v_group;
end;
$$;

-- C5: proposal review — the missing link between "submitted" and the rest
-- of the lifecycle. On approve, also advances the group so uploading a
-- deliverable becomes reachable (student/fyp/page.tsx only shows that
-- card once status is in_progress or later).
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
  if current_user_role() <> 'faculty' then
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

-- C5: the rest of the lifecycle — a fixed forward-only sequence, one step
-- at a time, supervisor-only. p_remarks is accepted for symmetry with
-- review_fyp_proposal but not persisted anywhere yet (fyp_groups has no
-- remarks column) — deliberately not adding one here, out of scope for
-- what C5 asked for.
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
  if current_user_role() <> 'faculty' then
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

-- C4: max_score is already server-controlled (submitEvaluationAction
-- sources it from a hardcoded constant, never client input) — this is
-- defense-in-depth so the constraint holds even if that ever changes.
alter table fyp_evaluations add constraint fyp_evaluations_score_le_max check (score <= max_score);
