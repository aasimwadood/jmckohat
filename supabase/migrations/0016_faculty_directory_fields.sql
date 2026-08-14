-- FacultyPage.tsx renders specialization, email, phone, and a publications
-- count per faculty member — not modeled in 0009's initial guess.
alter table faculty_directory
  add column specialization text,
  add column email text,
  add column phone text,
  add column publications_count int not null default 0;
