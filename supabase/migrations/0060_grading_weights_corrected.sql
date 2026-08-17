-- Correction to 0059: the real weightage is Internal 25% (Quizzes,
-- Assignments, Presentation — split however the teacher wants within that
-- pool) + Midterm 25% + External Final 50%, not the
-- 15/15/30/40 read off the (stale) Controller policy page text.
--
-- "Distribution depends on teacher" means there's no fixed per-component
-- cap within Internal — quiz1/quiz2/assignments_score/presentation can
-- each be anything, the constraint is on their *sum*, not each field
-- individually. Drop the rigid single-field caps 0059 added and replace
-- with a sum constraint instead.

alter table results add column presentation numeric not null default 0 check (presentation >= 0);

alter table results drop constraint if exists results_quiz1_max;
alter table results drop constraint if exists results_quiz2_max;
alter table results drop constraint if exists results_assignments_score_max;
alter table results add constraint results_internal_total_max
  check (quiz1 + quiz2 + assignments_score + presentation <= 25);

alter table results drop constraint if exists results_midterm_max;
alter table results add constraint results_midterm_max check (midterm <= 25);

alter table results drop constraint if exists results_final_exam_check;
alter table results add constraint results_final_exam_max check (final_exam >= 0 and final_exam <= 50);

alter table results drop column total;
alter table results add column total numeric generated always as
  (quiz1 + quiz2 + midterm + assignments_score + presentation + final_exam) stored;
