-- Two real bugs found while live-verifying the C3-C6 fix (0048), neither
-- caused by that migration — both pre-existing in the original FYP schema
-- (0007) and never previously exercised end-to-end:
--
-- Bug A: respond_to_fyp_supervision()'s UPDATE sets status via a bare
-- `case when ... then 'proposal_pending' else 'supervisor_pending' end`.
-- Both branches are untyped text literals, so the CASE result type resolves
-- to text, and Postgres has no implicit assignment cast from text to a user
-- enum — every call errored with "column is of type fyp_group_status but
-- expression is of type text". This means supervisor approve/decline never
-- worked in production. Fix: cast each branch explicitly.
--
-- Bug B: fyp_groups_select_scoped and fyp_members_select_scoped each embed
-- a cross-table EXISTS on the other (fyp_groups checks fyp_members for
-- co-membership; fyp_members checks fyp_groups for supervisor/staff access).
-- That mutual reference is a genuine RLS recursion cycle — any read that
-- has to fall through to the EXISTS branch on either table (i.e. isn't
-- satisfied by the first OR condition) trips Postgres's cycle detector
-- ("infinite recursion detected in policy for relation ..."). This blocks,
-- among other things, every proposal submission and every evaluation write
-- that doesn't hit the fast-path condition. Fix: same pattern as
-- teaches_course() (0003) — move fyp_members' cross-table check into a
-- SECURITY DEFINER helper, which queries fyp_groups without re-invoking
-- fyp_groups' own RLS, breaking the cycle. Semantics are preserved exactly
-- (same three conditions fyp_members_select_scoped already checked).

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
  set status = case when p_approve then 'proposal_pending'::fyp_group_status else 'supervisor_pending'::fyp_group_status end,
      supervisor_profile_id = case when p_approve then supervisor_profile_id else null end
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

create or replace function fyp_group_supervisor_or_staff(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from fyp_groups g where g.id = p_group_id and (
      g.supervisor_profile_id = auth.uid()
      or current_user_role() in ('admin', 'principal')
      or (current_user_role() = 'department' and g.department_id = current_department_id())
    )
  );
$$;

drop policy "fyp_members_select_scoped" on fyp_members;
create policy "fyp_members_select_scoped" on fyp_members
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or fyp_group_supervisor_or_staff(fyp_group_id)
  );
