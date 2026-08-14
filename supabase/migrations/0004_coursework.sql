create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  faculty_profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_course_idx on assignments (course_id);

create trigger assignments_set_updated_at
  before update on assignments
  for each row execute function set_updated_at();

create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  student_profile_id uuid not null references profiles (id) on delete cascade,
  file_path text,                    -- Storage object path in the "assignment-submissions" bucket
  submitted_at timestamptz not null default now(),
  grade numeric,
  graded_at timestamptz,
  graded_by uuid references profiles (id),
  unique (assignment_id, student_profile_id)
);

create index assignment_submissions_student_idx on assignment_submissions (student_profile_id);

create table course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  faculty_profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  type material_type not null default 'other',
  file_path text not null,           -- Storage object path in the "course-materials" bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index course_materials_course_idx on course_materials (course_id);

create trigger course_materials_set_updated_at
  before update on course_materials
  for each row execute function set_updated_at();

create table exam_schedules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  exam_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  room text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index exam_schedules_course_idx on exam_schedules (course_id);
create index exam_schedules_semester_idx on exam_schedules (semester_id);

-- Results -------------------------------------------------------------
-- `total` reconciles a formula inconsistency in the legacy frontend: the
-- faculty entry screen summed the four components, the student view
-- averaged them. Faculty-entered components are the source of truth, so
-- `total` is their sum (each component is expected to already be scaled to
-- its weight, per the assessment weightage documented in the Controller
-- dashboard's Exam Policies screen). See docs/MIGRATION_PLAN.md.
create table results (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  quiz1 numeric not null default 0 check (quiz1 >= 0),
  quiz2 numeric not null default 0 check (quiz2 >= 0),
  midterm numeric not null default 0 check (midterm >= 0),
  assignments_score numeric not null default 0 check (assignments_score >= 0),
  total numeric generated always as (quiz1 + quiz2 + midterm + assignments_score) stored,
  submitted_by uuid references profiles (id),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_profile_id, course_id, semester_id)
);

create index results_student_idx on results (student_profile_id);
create index results_course_idx on results (course_id);

create trigger results_set_updated_at
  before update on results
  for each row execute function set_updated_at();

-- RLS ---------------------------------------------------------------------

alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table course_materials enable row level security;
alter table exam_schedules enable row level security;
alter table results enable row level security;

create policy "assignments_select_enrolled_or_scoped" on assignments
  for select to authenticated
  using (
    teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = assignments.course_id and e.student_profile_id = auth.uid()
    )
    or current_role() in ('admin', 'principal')
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );
create policy "assignments_write_faculty_own_course" on assignments
  for all to authenticated
  using (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)))
  with check (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)));

create policy "submissions_select_own_or_faculty" on assignment_submissions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or exists (
      select 1 from assignments a where a.id = assignment_id and teaches_course(a.course_id)
    )
    or current_role() = 'admin'
  );
create policy "submissions_insert_own" on assignment_submissions
  for insert to authenticated
  with check (student_profile_id = auth.uid());
create policy "submissions_grade_faculty" on assignment_submissions
  for update to authenticated
  using (exists (select 1 from assignments a where a.id = assignment_id and teaches_course(a.course_id)))
  with check (exists (select 1 from assignments a where a.id = assignment_id and teaches_course(a.course_id)));

create policy "materials_select_enrolled_or_scoped" on course_materials
  for select to authenticated
  using (
    teaches_course(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = course_materials.course_id and e.student_profile_id = auth.uid()
    )
    or current_role() in ('admin', 'principal')
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );
create policy "materials_write_faculty_own_course" on course_materials
  for all to authenticated
  using (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)))
  with check (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)));

create policy "exam_schedules_select_authenticated" on exam_schedules
  for select to authenticated using (true);
create policy "exam_schedules_write_scoped" on exam_schedules
  for all to authenticated
  using (
    current_role() in ('admin', 'controller')
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  )
  with check (
    current_role() in ('admin', 'controller')
    or (
      current_role() = 'department'
      and exists (select 1 from courses c where c.id = course_id and c.department_id = current_department_id())
    )
  );

create policy "results_select_own_or_scoped" on results
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
create policy "results_write_faculty_own_course" on results
  for all to authenticated
  using (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)))
  with check (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)));
