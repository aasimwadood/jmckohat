-- Two real bugs found live: on the public college site, the Faculty page
-- and the Departments page's "Students"/"Faculty" counts were both showing
-- empty/zero for real visitors, despite the underlying data existing
-- (19 faculty_categories, 142 faculty_directory rows, 170 students at GPGC
-- Kohat) and RLS looking correct on paper.
--
-- Bug 1: anon gets "permission denied for table faculty_directory" even
-- selecting only the exact column list 0033_faculty_directory_phone_privacy
-- granted. Re-issuing the same revoke+grant here is a safe, idempotent fix
-- regardless of how the live grant state drifted from what that migration
-- declared.
revoke select on faculty_directory from anon;
grant select (
  id, category_id, department_id, name, designation, qualification,
  photo_path, specialization, email, publications_count, display_order
) on faculty_directory to anon;

-- Bug 2: app/college/[slug]/departments/page.tsx (a public, unauthenticated
-- page) queries `profiles` directly for a per-department student count.
-- `profiles` correctly has NO anon-read policy anywhere (it holds real PII
-- — email, phone, full name for every student) — so that query has always
-- silently returned zero rows for a real visitor, not because of a bug in
-- the RLS, but because the page was never allowed to read that table at
-- all. The fix is not to open profiles to anon (that would be a privacy
-- regression), but to expose only the aggregate count that page actually
-- needs, the same way other cross-boundary reads in this app go through a
-- narrow SECURITY DEFINER function rather than a broadened table grant.
create or replace function public_department_student_counts(p_college_id uuid)
returns table(department_id uuid, student_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select department_id, count(*)
  from profiles
  where role = 'student' and department_id is not null and college_id = p_college_id
  group by department_id;
$$;

grant execute on function public_department_student_counts(uuid) to anon, authenticated;
