create table courses (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  credits int not null default 3,
  department_id uuid not null references departments (id) on delete cascade,
  program_id uuid references programs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, code)
);

create trigger courses_set_updated_at
  before update on courses
  for each row execute function set_updated_at();

-- Which faculty teach which course, in which semester. Drives RLS for
-- materials/assignments/results ("faculty may only manage their own
-- courses") instead of trusting a role prop from the client as the legacy
-- frontend did.
create table course_faculty (
  course_id uuid not null references courses (id) on delete cascade,
  faculty_profile_id uuid not null references profiles (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  primary key (course_id, faculty_profile_id, semester_id)
);

create index course_faculty_faculty_idx on course_faculty (faculty_profile_id);
create index course_faculty_course_idx on course_faculty (course_id);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  status enrollment_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (student_profile_id, course_id, semester_id)
);

create index enrollments_student_idx on enrollments (student_profile_id);
create index enrollments_course_idx on enrollments (course_id);

create table timetable_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  faculty_profile_id uuid references profiles (id) on delete set null,
  department_id uuid not null references departments (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Mon .. 5=Sat
  start_time time not null,
  end_time time not null check (end_time > start_time),
  room text,
  group_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index timetable_entries_course_idx on timetable_entries (course_id);
create index timetable_entries_department_idx on timetable_entries (department_id);
create index timetable_entries_semester_idx on timetable_entries (semester_id);
create index timetable_entries_faculty_idx on timetable_entries (faculty_profile_id);

create trigger timetable_entries_set_updated_at
  before update on timetable_entries
  for each row execute function set_updated_at();

-- Helper used by several RLS policies below and in later migrations.
create or replace function teaches_course(target_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from course_faculty
    where course_id = target_course_id and faculty_profile_id = auth.uid()
  );
$$;

-- RLS ---------------------------------------------------------------------

alter table courses enable row level security;
alter table course_faculty enable row level security;
alter table enrollments enable row level security;
alter table timetable_entries enable row level security;

create policy "courses_select_authenticated" on courses
  for select to authenticated using (true);
create policy "courses_write_admin_or_own_department" on courses
  for all to authenticated
  using (
    current_role() = 'admin'
    or (current_role() = 'department' and department_id = current_department_id())
  )
  with check (
    current_role() = 'admin'
    or (current_role() = 'department' and department_id = current_department_id())
  );

create policy "course_faculty_select_authenticated" on course_faculty
  for select to authenticated using (true);
create policy "course_faculty_write_admin_or_department" on course_faculty
  for all to authenticated
  using (
    current_role() = 'admin'
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  )
  with check (
    current_role() = 'admin'
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );

create policy "enrollments_select_own_or_scoped" on enrollments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or teaches_course(course_id)
    or current_role() in ('admin', 'principal', 'controller')
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );
create policy "enrollments_write_admin_or_department" on enrollments
  for all to authenticated
  using (
    current_role() = 'admin'
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  )
  with check (
    current_role() = 'admin'
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );

create policy "timetable_select_authenticated" on timetable_entries
  for select to authenticated using (true);
create policy "timetable_write_scoped" on timetable_entries
  for all to authenticated
  using (
    current_role() in ('admin', 'coordinator')
    or (current_role() = 'department' and department_id = current_department_id())
  )
  with check (
    current_role() in ('admin', 'coordinator')
    or (current_role() = 'department' and department_id = current_department_id())
  );
