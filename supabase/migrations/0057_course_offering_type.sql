-- "Fresh" vs "repeat" is a property of a specific (course, teacher,
-- semester) offering, not of the course itself — the real CS timetable
-- (0048/§18) already had the same course code offered twice in different
-- semesters, once for the regular cohort and once "(Repeat students)". No
-- change needed for cross-department teachers: course_faculty_write_admin_or_department
-- (0046) already only checks that the *course* belongs to the caller's own
-- department, never that the assigned faculty_profile_id does — the HOD
-- picker UI was just never given a cross-department teacher list to choose
-- from.
alter table course_faculty
  add column offering_type text not null default 'fresh' check (offering_type in ('fresh', 'repeat'));
