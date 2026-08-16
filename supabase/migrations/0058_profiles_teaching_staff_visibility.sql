-- Real bug found live: §30's cross-department teacher picker (Curriculum
-- page) queried profiles college-wide, but RLS itself was still silently
-- filtering the result down to "your own row" + "your own department" —
-- profiles_select_same_department (0002) has no college-wide branch, and
-- profiles_select_admin_wide only covers admin/principal. A department
-- head could still *write* a cross-department course_faculty assignment
-- (that RLS only checks the course's department, not the teacher's — see
-- 0046) but could never *see* the other department's teachers to pick one
-- in the first place — the query looked broadened but RLS quietly
-- narrowed it back.
--
-- Scoped narrowly: only exposes teaching-capable staff (name/role/
-- department — a staff directory, not private data) college-wide, never
-- students. Doesn't touch phone/email column-level grants or any other
-- profiles policy.
create policy "profiles_select_teaching_staff_college_wide" on profiles
  for select to authenticated
  using (
    role in ('faculty', 'department', 'coordinator', 'controller')
    and college_id = current_college_id()
  );
