-- Gap found building the Student dashboard (Phase 8): the legacy app showed
-- per-course attendance and a detailed daily view, but had no real backend
-- for it — the detail view fell back to client-generated random mock data
-- whenever its endpoint failed (explicitly commented "remove once backend
-- is ready" in the legacy source). This is that backend.

create type attendance_status as enum ('present', 'absent', 'leave');

create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  session_date date not null,
  status attendance_status not null,
  marked_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (student_profile_id, course_id, session_date)
);

create index attendance_student_idx on attendance (student_profile_id);
create index attendance_course_idx on attendance (course_id);

alter table attendance enable row level security;

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
  );

create policy "attendance_write_faculty_own_course" on attendance
  for all to authenticated
  using (current_user_role() = 'admin' or (current_user_role() = 'faculty' and teaches_course(course_id)))
  with check (current_user_role() = 'admin' or (current_user_role() = 'faculty' and teaches_course(course_id)));
