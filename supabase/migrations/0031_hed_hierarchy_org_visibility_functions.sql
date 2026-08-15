-- HED hierarchy, part 4: reusable predicates for "can the current
-- hed_admin/directorate_admin/jmc_admin see this row", so the additive
-- RLS clause added to each existing policy in 0032 is one line, not a
-- repeated 15-line join. Composes on top of the college/jmc/directorate
-- SECURITY DEFINER helpers already in 0027/0029.
--
-- Scope of this sub-phase, deliberately not "every table": only the
-- tables that actually feed HED/Directorate/JMC-level reporting per spec
-- §17-19/§30 (profiles, admissions, promotions, fee_payments, and the
-- course-linked academic tables: enrollments, assignments/submissions,
-- course_materials, results, attendance). FYP, announcements,
-- notifications, library/tickets/events, scholarships, course_file_reports
-- and similar operational tables are NOT extended here — no spec section
-- asks an HED/Directorate/JMC admin to see individual FYP deliverables or
-- support tickets, and extending everything mechanically would be scope
-- creep with real security-review cost for no requested benefit.

create or replace function college_visible_to_org_admin(p_college_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and jmc_directorate_id(college_jmc_id(p_college_id)) = current_directorate_id())
    or (current_user_role() = 'jmc_admin' and college_jmc_id(p_college_id) = current_jmc_id());
$$;

create or replace function department_visible_to_org_admin(p_department_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select college_visible_to_org_admin((select college_id from departments where id = p_department_id));
$$;

create or replace function profile_visible_to_org_admin(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select college_visible_to_org_admin((select college_id from profiles where id = p_profile_id));
$$;

create or replace function course_visible_to_org_admin(p_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select department_visible_to_org_admin((select department_id from courses where id = p_course_id));
$$;
