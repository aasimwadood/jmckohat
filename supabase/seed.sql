-- Development/test seed data only — never run against production. Gives
-- local development something to click through (a department to register
-- into, an active academic session/semester) before real data exists.
insert into departments (name, code) values
  ('Computer Science', 'CS'),
  ('Physics', 'PH'),
  ('Chemistry', 'CH'),
  ('Mathematics', 'MA')
on conflict (code) do nothing;

insert into academic_sessions (label, is_active) values ('2025', true)
on conflict (label) do nothing;

insert into semesters (academic_session_id, number, is_current)
select id, gs.n, gs.n = 1
from academic_sessions, generate_series(1, 8) as gs(n)
where label = '2025'
on conflict (academic_session_id, number) do nothing;
