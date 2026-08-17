-- Five real gaps from the workflow audit's "functional gaps" tier
-- (docs/WORKFLOW_AUDIT.md), fixed together since they're all grading/
-- storage-integrity issues:
--
-- 1. results had no Final Exam field despite the Controller's own
--    documented policy (app/dashboard/controller/policies/page.tsx):
--    "Quizzes 15% · Assignments 15% · Midterm 30% · Final 40%". Final is
--    issued by the affiliating university, not entered by college faculty
--    — it's the Controller's job (the college's actual point of contact
--    with the university's examination system) to record it once
--    received, independent of who teaches the course.
-- 2. Every results component (quiz1/quiz2/midterm/assignments_score) only
--    had a `>= 0` floor, no ceiling — effectively unbounded. Added real
--    upper bounds matching the documented weightage (quizzes split 15%
--    across quiz1+quiz2 = 7.5 each; assignments 15%; midterm 30%).
-- 3. assignment_submissions.grade had no relationship to any per-assignment
--    max-marks value (there wasn't one) — same unbounded problem.

alter table results add column final_exam numeric not null default 0 check (final_exam >= 0 and final_exam <= 40);
alter table results add constraint results_quiz1_max check (quiz1 <= 7.5);
alter table results add constraint results_quiz2_max check (quiz2 <= 7.5);
alter table results add constraint results_midterm_max check (midterm <= 30);
alter table results add constraint results_assignments_score_max check (assignments_score <= 15);

alter table results drop column total;
alter table results add column total numeric generated always as (quiz1 + quiz2 + midterm + assignments_score + final_exam) stored;

-- Controller can record the university-issued Final Exam mark for any
-- course at their own college, independent of teaches_course() — matches
-- their real role (examination administration), not a teaching
-- relationship. The action layer only ever sends `final_exam` on this
-- path, same table-level-RLS-plus-app-discipline convention used
-- throughout this app (e.g. updateEnrollmentStatusAction).
drop policy "results_write_faculty_own_course" on results;
create policy "results_write_faculty_own_course" on results
  for all to authenticated
  using (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator') and teaches_course(course_id))
    or (current_user_role() = 'controller' and course_college_id(course_id) = current_college_id())
  )
  with check (
    (current_user_role() in ('admin', 'college_admin') and course_college_id(course_id) = current_college_id())
    or (current_user_role() in ('faculty', 'department', 'coordinator') and teaches_course(course_id))
    or (current_user_role() = 'controller' and course_college_id(course_id) = current_college_id())
  );

-- Real max-marks bound for assignment grading, enforced with a trigger
-- (not a CHECK constraint — Postgres CHECK can't reference another table)
-- same defense-in-depth pattern as fyp_evaluations_score_le_max (0048).
alter table assignments add column max_marks numeric not null default 100 check (max_marks > 0);

create or replace function check_submission_grade_within_max_marks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_marks numeric;
begin
  if new.grade is null then
    return new;
  end if;
  select max_marks into v_max_marks from assignments where id = new.assignment_id;
  if new.grade > v_max_marks then
    raise exception 'grade_exceeds_max_marks: % > % for this assignment', new.grade, v_max_marks;
  end if;
  return new;
end;
$$;

create trigger assignment_submissions_check_grade
  before insert or update of grade on assignment_submissions
  for each row execute function check_submission_grade_within_max_marks();

-- 4. Storage-vs-table RLS mismatch: materials_select_enrolled_or_scoped
-- (0046) lets a department head read course_materials rows for their own
-- department's courses, but the matching Storage bucket policy (0010)
-- never had that branch — a department head could see a material exists
-- in the table but the file itself would 403. Realigned to match exactly.
drop policy "course_materials_bucket_select" on storage.objects;
create policy "course_materials_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and (
      teaches_course(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from enrollments e
        where e.course_id = ((storage.foldername(name))[1])::uuid and e.student_profile_id = auth.uid()
      )
      or (current_user_role() in ('admin', 'principal', 'college_admin') and course_college_id(((storage.foldername(name))[1])::uuid) = current_college_id())
      or (
        current_user_role() = 'department'
        and exists (
          select 1 from courses c
          where c.id = ((storage.foldername(name))[1])::uuid and c.department_id = current_department_id()
        )
      )
      or course_visible_to_org_admin(((storage.foldername(name))[1])::uuid)
    )
  );
