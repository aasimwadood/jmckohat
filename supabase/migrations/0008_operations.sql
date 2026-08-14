-- Announcements ------------------------------------------------------------

create table announcements (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references profiles (id),
  scope announcement_scope not null default 'institution',
  department_id uuid references departments (id),
  course_id uuid references courses (id),
  title text not null,
  body text not null,
  published_at timestamptz,        -- null = draft
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'institution' and department_id is null and course_id is null)
    or (scope = 'department' and department_id is not null and course_id is null)
    or (scope = 'course' and course_id is not null)
  )
);

create index announcements_department_idx on announcements (department_id);
create index announcements_course_idx on announcements (course_id);
create index announcements_scope_idx on announcements (scope);

create trigger announcements_set_updated_at
  before update on announcements
  for each row execute function set_updated_at();

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text,
  related_entity text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on notifications (profile_id, read_at);

-- Examinations office --------------------------------------------------

create table transcript_requests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_by uuid references profiles (id),
  processed_at timestamptz,
  file_path text
);

create index transcript_requests_student_idx on transcript_requests (student_profile_id);

create table result_queries (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'resolved', 'rejected')),
  resolution_note text,
  fee_receipt_number text,          -- PKR 500 rechecking fee, per legacy policy text
  requested_at timestamptz not null default now(),
  resolved_by uuid references profiles (id),
  resolved_at timestamptz
);

create index result_queries_student_idx on result_queries (student_profile_id);

-- Coordinator ------------------------------------------------------------

create table academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  department_id uuid references departments (id),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index academic_calendar_department_idx on academic_calendar_events (department_id);

-- Administration (accountant) --------------------------------------------

create table library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text,
  total_copies int not null default 1,
  available_copies int not null default 1,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  raised_by uuid references profiles (id),
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  resolved_by uuid references profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table campus_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  location text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table scholarships (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  amount numeric not null check (amount >= 0),
  academic_session_id uuid references academic_sessions (id),
  awarded_by uuid references profiles (id),
  awarded_at timestamptz not null default now()
);

create index scholarships_student_idx on scholarships (student_profile_id);

-- Course File Report -------------------------------------------------------
-- The legacy screen was 100% hardcoded (CLOs, weekly content, assessment
-- plan, books, attainment, attendance roster) with zero backing API. There
-- is no existing server behavior to preserve here — this is a fresh design
-- choice: one JSONB document per (course, semester) rather than ~8
-- additional normalized tables, since the report's internal structure
-- (CLO list, weekly plan, book list) has no cross-table relationships
-- elsewhere in the schema and is edited/read as a single unit.
create table course_file_reports (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  faculty_profile_id uuid not null references profiles (id),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (course_id, semester_id)
);

create trigger course_file_reports_set_updated_at
  before update on course_file_reports
  for each row execute function set_updated_at();

-- Role permissions + audit log ---------------------------------------------

create table role_permissions (
  role user_role not null,
  resource text not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  primary key (role, resource)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id);
create index audit_log_actor_idx on audit_log (actor_profile_id);

-- Public contact form -------------------------------------------------------

create table messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  body text not null,
  created_at timestamptz not null default now()
);

-- RLS ---------------------------------------------------------------------

alter table announcements enable row level security;
alter table notifications enable row level security;
alter table transcript_requests enable row level security;
alter table result_queries enable row level security;
alter table academic_calendar_events enable row level security;
alter table library_items enable row level security;
alter table support_tickets enable row level security;
alter table campus_events enable row level security;
alter table scholarships enable row level security;
alter table course_file_reports enable row level security;
alter table role_permissions enable row level security;
alter table audit_log enable row level security;
alter table messages enable row level security;

create policy "announcements_select_scoped" on announcements
  for select to authenticated
  using (
    published_at is not null and (
      scope = 'institution'
      or (scope = 'department' and department_id = current_department_id())
      or (scope = 'course' and (
        teaches_course(course_id)
        or exists (select 1 from enrollments e where e.course_id = announcements.course_id and e.student_profile_id = auth.uid())
      ))
    )
  );
create policy "announcements_select_own_drafts" on announcements
  for select to authenticated using (author_profile_id = auth.uid());
create policy "announcements_select_admin_wide" on announcements
  for select to authenticated using (current_role() in ('admin', 'principal'));
create policy "announcements_write_staff" on announcements
  for all to authenticated
  using (
    current_role() in ('admin', 'principal')
    or (current_role() = 'department' and department_id = current_department_id())
    or (current_role() = 'faculty' and teaches_course(course_id))
  )
  with check (author_profile_id = auth.uid());

create policy "notifications_select_own" on notifications
  for select to authenticated using (profile_id = auth.uid());
create policy "notifications_update_own" on notifications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "notifications_insert_staff" on notifications
  for insert to authenticated with check (is_staff() or current_role() in ('faculty', 'department'));

create policy "transcript_requests_select_scoped" on transcript_requests
  for select to authenticated
  using (student_profile_id = auth.uid() or current_role() in ('admin', 'controller', 'principal'));
create policy "transcript_requests_insert_own" on transcript_requests
  for insert to authenticated with check (student_profile_id = auth.uid());
create policy "transcript_requests_update_controller" on transcript_requests
  for update to authenticated
  using (current_role() in ('admin', 'controller'))
  with check (current_role() in ('admin', 'controller'));

create policy "result_queries_select_scoped" on result_queries
  for select to authenticated
  using (student_profile_id = auth.uid() or current_role() in ('admin', 'controller', 'principal'));
create policy "result_queries_insert_own" on result_queries
  for insert to authenticated with check (student_profile_id = auth.uid());
create policy "result_queries_update_controller" on result_queries
  for update to authenticated
  using (current_role() in ('admin', 'controller'))
  with check (current_role() in ('admin', 'controller'));

create policy "academic_calendar_select_authenticated" on academic_calendar_events
  for select to authenticated using (true);
create policy "academic_calendar_write_coordinator" on academic_calendar_events
  for all to authenticated
  using (current_role() in ('admin', 'coordinator'))
  with check (current_role() in ('admin', 'coordinator'));

create policy "library_items_select_authenticated" on library_items
  for select to authenticated using (true);
create policy "library_items_write_administration" on library_items
  for all to authenticated
  using (current_role() in ('admin', 'administration'))
  with check (current_role() in ('admin', 'administration'));

create policy "support_tickets_select_scoped" on support_tickets
  for select to authenticated
  using (raised_by = auth.uid() or current_role() in ('admin', 'administration'));
create policy "support_tickets_insert_own" on support_tickets
  for insert to authenticated with check (raised_by = auth.uid());
create policy "support_tickets_update_administration" on support_tickets
  for update to authenticated
  using (current_role() in ('admin', 'administration'))
  with check (current_role() in ('admin', 'administration'));

create policy "campus_events_select_authenticated" on campus_events
  for select to authenticated using (true);
create policy "campus_events_write_administration" on campus_events
  for all to authenticated
  using (current_role() in ('admin', 'administration'))
  with check (current_role() in ('admin', 'administration'));

create policy "scholarships_select_scoped" on scholarships
  for select to authenticated
  using (student_profile_id = auth.uid() or current_role() in ('admin', 'administration', 'principal'));
create policy "scholarships_write_administration" on scholarships
  for all to authenticated
  using (current_role() in ('admin', 'administration'))
  with check (current_role() in ('admin', 'administration'));

create policy "course_file_reports_select_scoped" on course_file_reports
  for select to authenticated
  using (
    teaches_course(course_id)
    or current_role() in ('admin', 'principal')
    or (current_role() = 'department' and exists (
      select 1 from courses c where c.id = course_id and c.department_id = current_department_id()
    ))
  );
create policy "course_file_reports_write_faculty_own_course" on course_file_reports
  for all to authenticated
  using (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)))
  with check (current_role() = 'admin' or (current_role() = 'faculty' and teaches_course(course_id)));

create policy "role_permissions_select_authenticated" on role_permissions
  for select to authenticated using (true);
create policy "role_permissions_write_admin" on role_permissions
  for all to authenticated
  using (current_role() = 'admin')
  with check (current_role() = 'admin');

create policy "audit_log_select_admin" on audit_log
  for select to authenticated using (current_role() = 'admin');
-- Inserts happen exclusively from server-side code using the service-role
-- client (lib/services write an audit row alongside every sensitive
-- mutation) — no INSERT policy is granted to `authenticated`.

create policy "messages_insert_anyone" on messages
  for insert to anon, authenticated with check (true);
create policy "messages_select_staff" on messages
  for select to authenticated using (current_role() in ('admin', 'administration'));
