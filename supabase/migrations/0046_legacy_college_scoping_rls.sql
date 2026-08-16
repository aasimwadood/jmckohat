-- Workflow audit fix (docs/WORKFLOW_AUDIT.md C1 / Theme 2), part 2: RLS.
--
-- Every policy below is dropped and recreated with exactly one change: the
-- previously-unscoped admin/principal/controller/coordinator/administration
-- branch gains a college_id match via the resolvers from 0045, and
-- `college_admin` is added alongside it (closing Theme 2 in the same pass —
-- it's the same fix in both directions). Every other existing branch
-- (own-row, department-scoped, org-admin-scoped via 0031/0032's helpers)
-- is preserved unchanged. Deliberately NOT touched: `courses`/
-- `course_faculty`/`timetable_entries`/`exam_schedules`'s SELECT policies
-- (`for select to authenticated using (true)`) — these were already
-- open-within-the-app by original design, not part of what the audit
-- flagged.

-- admissions -----------------------------------------------------------

drop policy "admissions_select_scoped" on admissions;
create policy "admissions_select_scoped" on admissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and department_college_id(department_id) = current_college_id()
    )
    or (current_user_role() in ('department', 'faculty') and department_id = current_department_id())
    or department_visible_to_org_admin(department_id)
  );

drop policy "admissions_update_admin_only" on admissions;
create policy "admissions_update_admin_only" on admissions
  for update to authenticated
  using (current_user_role() = 'admin' and department_college_id(department_id) = current_college_id())
  with check (current_user_role() = 'admin' and department_college_id(department_id) = current_college_id());

drop policy "admission_documents_select_scoped" on admission_documents;
create policy "admission_documents_select_scoped" on admission_documents
  for select to authenticated
  using (
    exists (
      select 1 from admissions ad where ad.id = admission_id and (
        ad.student_profile_id = auth.uid()
        or (
          current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
          and department_college_id(ad.department_id) = current_college_id()
        )
        or (current_user_role() in ('department', 'faculty') and ad.department_id = current_department_id())
      )
    )
  );

drop policy "admission_documents_write_department_or_faculty" on admission_documents;
create policy "admission_documents_write_department_or_faculty" on admission_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from admissions ad where ad.id = admission_id and (
        (current_user_role() = 'admin' and department_college_id(ad.department_id) = current_college_id())
        or (current_user_role() in ('department', 'faculty') and ad.department_id = current_department_id())
      )
    )
  );

-- fee_payments -----------------------------------------------------------

drop policy "fee_payments_select_scoped" on fee_payments;
create policy "fee_payments_select_scoped" on fee_payments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and profile_college_id(student_profile_id) = current_college_id()
    )
    or (
      current_user_role() = 'department'
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );

drop policy "fee_payments_write_admin_or_administration" on fee_payments;
create policy "fee_payments_write_admin_or_administration" on fee_payments
  for all to authenticated
  using (current_user_role() in ('admin', 'administration') and profile_college_id(student_profile_id) = current_college_id())
  with check (current_user_role() in ('admin', 'administration') and profile_college_id(student_profile_id) = current_college_id());

-- promotions -----------------------------------------------------------

drop policy "promotions_select_scoped" on promotions;
create policy "promotions_select_scoped" on promotions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and profile_college_id(student_profile_id) = current_college_id()
    )
    or (
      current_user_role() in ('department', 'faculty')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );

drop policy "promotions_insert_admin_or_department" on promotions;
create policy "promotions_insert_admin_or_department" on promotions
  for insert to authenticated
  with check (
    (current_user_role() = 'admin' and profile_college_id(student_profile_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
  );

drop policy "promotions_update_admin_only" on promotions;
create policy "promotions_update_admin_only" on promotions
  for update to authenticated
  using (current_user_role() = 'admin' and profile_college_id(student_profile_id) = current_college_id())
  with check (current_user_role() = 'admin' and profile_college_id(student_profile_id) = current_college_id());

-- courses / course_faculty / enrollments / timetable_entries ------------

drop policy "courses_write_admin_or_own_department" on courses;
create policy "courses_write_admin_or_own_department" on courses
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and department_college_id(department_id) = current_college_id())
    or (current_user_role() = 'department' and department_id = current_department_id())
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and department_college_id(department_id) = current_college_id())
    or (current_user_role() = 'department' and department_id = current_department_id())
  );

drop policy "course_faculty_write_admin_or_department" on course_faculty;
create policy "course_faculty_write_admin_or_department" on course_faculty
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );

drop policy "enrollments_select_own_or_scoped" on enrollments;
create policy "enrollments_select_own_or_scoped" on enrollments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or (
      current_user_role() in ('admin', 'principal', 'controller', 'college_admin')
      and course_college_id(course_id) = current_college_id()
    )
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

drop policy "enrollments_write_admin_or_department" on enrollments;
create policy "enrollments_write_admin_or_department" on enrollments
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );

drop policy "timetable_write_scoped" on timetable_entries;
create policy "timetable_write_scoped" on timetable_entries
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'coordinator', 'college_admin') and department_college_id(department_id) = current_college_id())
    or (current_user_role() = 'department' and department_id = current_department_id())
  )
  with check (
    (current_user_role() in ('admin', 'coordinator', 'college_admin') and department_college_id(department_id) = current_college_id())
    or (current_user_role() = 'department' and department_id = current_department_id())
  );

-- assignments / assignment_submissions / course_materials ---------------

drop policy "assignments_select_enrolled_or_scoped" on assignments;
create policy "assignments_select_enrolled_or_scoped" on assignments
  for select to authenticated
  using (
    teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = assignments.course_id and e.student_profile_id = auth.uid()
    )
    or (current_user_role() in ('admin', 'principal', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

drop policy "assignments_write_faculty_own_course" on assignments;
create policy "assignments_write_faculty_own_course" on assignments
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  );

drop policy "submissions_select_own_or_faculty" on assignment_submissions;
create policy "submissions_select_own_or_faculty" on assignment_submissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or exists (
      select 1 from assignments a where a.id = assignment_id and teaches_course(a.course_id)
    )
    or exists (
      select 1 from assignments a where a.id = assignment_id
      and current_user_role() in ('admin', 'college_admin')
      and course_college_id(a.course_id) = current_college_id()
    )
    or exists (
      select 1 from assignments a where a.id = assignment_id and course_visible_to_org_admin(a.course_id)
    )
  );

drop policy "materials_select_enrolled_or_scoped" on course_materials;
create policy "materials_select_enrolled_or_scoped" on course_materials
  for select to authenticated
  using (
    teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = course_materials.course_id and e.student_profile_id = auth.uid()
    )
    or (current_user_role() in ('admin', 'principal', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

drop policy "materials_write_faculty_own_course" on course_materials;
create policy "materials_write_faculty_own_course" on course_materials
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  );

-- exam_schedules / results / attendance ----------------------------------

drop policy "exam_schedules_write_scoped" on exam_schedules;
create policy "exam_schedules_write_scoped" on exam_schedules
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'controller', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  )
  with check (
    (current_user_role() in ('admin', 'controller', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );

drop policy "results_select_own_or_scoped" on results;
create policy "results_select_own_or_scoped" on results
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or (
      current_user_role() in ('admin', 'principal', 'controller', 'college_admin')
      and course_college_id(course_id) = current_college_id()
    )
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

drop policy "results_write_faculty_own_course" on results;
create policy "results_write_faculty_own_course" on results
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  );

drop policy "attendance_select_scoped" on attendance;
create policy "attendance_select_scoped" on attendance
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or (
      current_user_role() in ('admin', 'principal', 'controller', 'college_admin')
      and course_college_id(course_id) = current_college_id()
    )
    or (
      current_user_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
    or course_visible_to_org_admin(course_id)
  );

drop policy "attendance_write_faculty_own_course" on attendance;
create policy "attendance_write_faculty_own_course" on attendance
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() = 'faculty' and teaches_course(course_id))
  );
