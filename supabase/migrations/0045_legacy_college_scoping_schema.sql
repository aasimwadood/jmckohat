-- Workflow audit fix (docs/WORKFLOW_AUDIT.md C1 / Theme 2), part 1: helper
-- functions + data backfill.
--
-- admin/principal/controller/coordinator/administration predate the
-- multi-college schema and were never scoped by college anywhere — every
-- RLS branch for them across admissions/fee_payments/promotions/the
-- academic core is a bare `current_user_role() in (...)` check. Unlike
-- `department`/`faculty` (whose college_id is already correctly derived
-- from department_id via the existing sync_profile_college_id() trigger),
-- these 5 roles are department-optional, so they need college_id set
-- directly — the same way `college_admin` already gets it.
--
-- These three resolvers are deliberately NOT role-specific (unlike
-- `department_visible_to_org_admin()` etc. in 0031) — they're plain
-- lookups reusable by any RLS policy or function that needs "what college
-- does this department/course/profile belong to," which 0046/0047 both
-- need against different tables.

create or replace function department_college_id(p_department_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select college_id from departments where id = p_department_id;
$$;

create or replace function course_college_id(p_course_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select department_college_id(department_id) from courses where id = p_course_id;
$$;

create or replace function profile_college_id(p_profile_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select college_id from profiles where id = p_profile_id;
$$;

-- Backfill: every existing account in one of the 5 department-optional
-- staff roles that has no college_id gets GPGC Kohat's — the only real
-- college with such accounts today (same "migrate in place" approach as
-- 0042's public-content backfill). New accounts going forward set this
-- explicitly at provisioning time (see lib/actions/provision-staff.ts).
update profiles
set college_id = (select id from colleges where code = 'GPGC-KOH')
where role in ('admin', 'principal', 'controller', 'coordinator', 'administration')
  and college_id is null;
