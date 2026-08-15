-- HED hierarchy, part 5: additive read visibility for hed_admin/
-- directorate_admin/jmc_admin on the reporting-relevant tables. Every
-- policy below is dropped and recreated with exactly one new `or` branch
-- appended — nothing else about the existing policy changes, so every
-- role/scope combination that worked before still works identically.
-- Write access is NOT extended anywhere here: these three roles get
-- reporting/oversight visibility (spec §13, §17-19, §30), not the ability
-- to edit academic records.

-- profiles: add org-admin visibility on top of the existing
-- admin/principal-wide policy (own-row and same-department policies are
-- untouched).
drop policy "profiles_select_admin_wide" on profiles;
create policy "profiles_select_admin_wide" on profiles
  for select to authenticated
  using (
    current_user_role() in ('admin', 'principal')
    or college_visible_to_org_admin(college_id)
  );

-- enrollments
drop policy "enrollments_select_own_or_scoped" on enrollments;
create policy "enrollments_select_own_or_scoped" on enrollments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or current_user_role() in ('admin', 'principal', 'controller')
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

-- assignments
drop policy "assignments_select_enrolled_or_scoped" on assignments;
create policy "assignments_select_enrolled_or_scoped" on assignments
  for select to authenticated
  using (
    teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = assignments.course_id and e.student_profile_id = auth.uid()
    )
    or current_user_role() in ('admin', 'principal')
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

-- assignment_submissions (no course_id column directly — resolved via its assignment)
drop policy "submissions_select_own_or_faculty" on assignment_submissions;
create policy "submissions_select_own_or_faculty" on assignment_submissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or exists (
      select 1 from assignments a where a.id = assignment_id and teaches_course(a.course_id)
    )
    or current_user_role() = 'admin'
    or exists (
      select 1 from assignments a where a.id = assignment_id and course_visible_to_org_admin(a.course_id)
    )
  );

-- course_materials
drop policy "materials_select_enrolled_or_scoped" on course_materials;
create policy "materials_select_enrolled_or_scoped" on course_materials
  for select to authenticated
  using (
    teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = course_materials.course_id and e.student_profile_id = auth.uid()
    )
    or current_user_role() in ('admin', 'principal')
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

-- results
drop policy "results_select_own_or_scoped" on results;
create policy "results_select_own_or_scoped" on results
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or current_user_role() in ('admin', 'principal', 'controller')
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

-- attendance
drop policy "attendance_select_scoped" on attendance;
create policy "attendance_select_scoped" on attendance
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or current_user_role() in ('admin', 'principal', 'controller')
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

-- admissions
drop policy "admissions_select_scoped" on admissions;
create policy "admissions_select_scoped" on admissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or current_user_role() in ('admin', 'principal', 'administration')
    or (current_user_role() in ('department', 'faculty') and department_id = current_department_id())
    or department_visible_to_org_admin(department_id)
  );

-- fee_payments
drop policy "fee_payments_select_scoped" on fee_payments;
create policy "fee_payments_select_scoped" on fee_payments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or current_user_role() in ('admin', 'principal', 'administration')
    or (
      current_user_role() = 'department'
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );

-- promotions
drop policy "promotions_select_scoped" on promotions;
create policy "promotions_select_scoped" on promotions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or current_user_role() in ('admin', 'principal', 'administration')
    or (
      current_user_role() in ('department', 'faculty')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );
