-- Recruitment / Appointment system, part 1: enums + tables.
--
-- Job applicants are a deliberately separate identity from `profiles` (see
-- 0038's handle_new_user() change) — they are external candidates, not
-- students or staff, so none of the existing ~65 college-domain RLS
-- policies or the `user_role` enum need to change. `coordinator` (an
-- existing role, see 0001) is the primary manager of this module, per
-- spec; `admin`/`principal`/`college_admin` get oversight + the
-- appointment-issuing step specifically (see 0038's issue_appointment_order).

create type recruitment_ad_status as enum (
  'draft',
  'published',
  'applications_open',
  'applications_closed',
  'under_scrutiny',
  'scrutiny_completed',
  'merit_generated',
  'candidates_shortlisted',
  'interviews_scheduled',
  'interviews_completed',
  'final_merit_prepared',
  'selection_finalized',
  'appointment_orders_issued',
  'completed',
  'cancelled'
);

create type recruitment_application_status as enum (
  'draft',
  'submitted',
  'under_scrutiny',
  'documents_under_verification',
  'eligible',
  'ineligible',
  'shortlisted',
  'interview_scheduled',
  'interview_completed',
  'selected',
  'waiting_list',
  'not_selected',
  'appointment_issued',
  'rejected',
  'withdrawn'
);

create type recruitment_document_status as enum ('pending', 'verified', 'rejected', 'not_required');
create type recruitment_eligibility_status as enum ('pending', 'eligible', 'ineligible');
create type recruitment_attendance as enum ('present', 'absent');

-- Applicant identity ----------------------------------------------------
-- 1:1 extension of auth.users, structurally like `profiles` but completely
-- separate from it — see 0038 for why the signup trigger must not create a
-- `profiles` row for these accounts.
create table applicant_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  father_name text,
  cnic text,
  dob date,
  gender text,
  phone text,
  email text not null,
  address text,
  domicile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger applicant_profiles_set_updated_at
  before update on applicant_profiles
  for each row execute function set_updated_at();

-- Advertisements + positions ---------------------------------------------

create table recruitment_advertisements (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete restrict,
  title text not null,
  ad_number text,
  ad_date date not null default current_date,
  opening_date date not null,
  closing_date date not null,
  interview_date date,
  location text,
  description text,
  instructions text,
  status recruitment_ad_status not null default 'draft',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_advertisements_dates_chk check (closing_date >= opening_date)
);

create index recruitment_advertisements_college_idx on recruitment_advertisements (college_id);
create index recruitment_advertisements_status_idx on recruitment_advertisements (status);

create trigger recruitment_advertisements_set_updated_at
  before update on recruitment_advertisements
  for each row execute function set_updated_at();

create table recruitment_positions (
  id uuid primary key default gen_random_uuid(),
  advertisement_id uuid not null references recruitment_advertisements (id) on delete cascade,
  title text not null,
  department_id uuid references departments (id) on delete set null,
  bps_grade text,
  vacancies int not null check (vacancies > 0),
  required_qualification text,
  required_degree text,
  required_subject text,
  required_experience text,
  age_limit text,
  gender_requirement text,
  domicile_requirement text,
  quota_category text,
  other_criteria text,
  -- Configurable shortlist rule (spec: "5 per position typically, but
  -- configurable") — the actual shortlist is still an explicit coordinator
  -- action (see shortlist_recruitment_candidates in 0038), this only seeds
  -- the suggested count.
  interview_shortlist_per_vacancy int not null default 5 check (interview_shortlist_per_vacancy > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recruitment_positions_advertisement_idx on recruitment_positions (advertisement_id);
create index recruitment_positions_department_idx on recruitment_positions (department_id);

create trigger recruitment_positions_set_updated_at
  before update on recruitment_positions
  for each row execute function set_updated_at();

-- Configurable merit formula (spec item 22: "do not hard-code one merit
-- formula") — each position defines its own weighted criteria; scores are
-- entered per application per criterion (recruitment_merit_scores below)
-- and totalled by the recruitment_application_merit_totals view.
create table recruitment_merit_criteria (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references recruitment_positions (id) on delete cascade,
  name text not null,
  max_score numeric not null check (max_score > 0),
  sort_order int not null default 0
);

create index recruitment_merit_criteria_position_idx on recruitment_merit_criteria (position_id);

create table recruitment_required_documents (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references recruitment_positions (id) on delete cascade,
  document_type text not null,
  is_mandatory boolean not null default true
);

create index recruitment_required_documents_position_idx on recruitment_required_documents (position_id);

-- Applications -------------------------------------------------------------

create table recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text unique,   -- assigned atomically on submit, see submit_recruitment_application()
  position_id uuid not null references recruitment_positions (id) on delete restrict,
  applicant_id uuid not null references applicant_profiles (id) on delete cascade,
  status recruitment_application_status not null default 'draft',
  -- Academic info, inlined rather than normalized — matches how
  -- `admissions` keeps applicant data flat (see 0005).
  qualification text,
  degree text,
  institution text,
  subject text,
  year_of_completion int,
  marks_obtained numeric,
  total_marks numeric,
  percentage_cgpa numeric,
  eligibility_status recruitment_eligibility_status not null default 'pending',
  scrutiny_remarks text,
  scrutinized_by uuid references profiles (id),
  scrutinized_at timestamptz,
  rejection_reason text,
  final_rank int,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (position_id, applicant_id)
);

create index recruitment_applications_position_idx on recruitment_applications (position_id);
create index recruitment_applications_applicant_idx on recruitment_applications (applicant_id);
create index recruitment_applications_status_idx on recruitment_applications (status);

create trigger recruitment_applications_set_updated_at
  before update on recruitment_applications
  for each row execute function set_updated_at();

create table recruitment_application_experience (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references recruitment_applications (id) on delete cascade,
  organization text not null,
  position text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text
);

create index recruitment_application_experience_application_idx on recruitment_application_experience (application_id);

create table recruitment_application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references recruitment_applications (id) on delete cascade,
  document_type text not null,
  file_path text not null,   -- Storage object path in the "recruitment-documents" bucket
  uploaded_at timestamptz not null default now(),
  verification_status recruitment_document_status not null default 'pending',
  verified_by uuid references profiles (id),
  verified_at timestamptz,
  verification_remarks text
);

create index recruitment_application_documents_application_idx on recruitment_application_documents (application_id);

create table recruitment_merit_scores (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references recruitment_applications (id) on delete cascade,
  criterion_id uuid not null references recruitment_merit_criteria (id) on delete cascade,
  score numeric not null check (score >= 0),
  entered_by uuid not null references profiles (id),
  entered_at timestamptz not null default now(),
  unique (application_id, criterion_id)
);

create index recruitment_merit_scores_application_idx on recruitment_merit_scores (application_id);

-- Totals recomputed on read, never stored/synced — avoids trigger drift.
create view recruitment_application_merit_totals as
  select application_id, sum(score) as total_score
  from recruitment_merit_scores
  group by application_id;

-- Interviews -----------------------------------------------------------

create table recruitment_interviews (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references recruitment_positions (id) on delete cascade,
  interview_date date not null,
  interview_time text,
  venue text,
  panel_info text,     -- descriptive text (names/designations) — see plan assumption on interview panels
  instructions text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index recruitment_interviews_position_idx on recruitment_interviews (position_id);

create table recruitment_interview_marks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references recruitment_applications (id) on delete cascade,
  interview_id uuid not null references recruitment_interviews (id) on delete cascade,
  attendance recruitment_attendance not null default 'present',
  marks numeric,
  remarks text,
  entered_by uuid references profiles (id),
  entered_at timestamptz,
  finalized boolean not null default false,
  finalized_by uuid references profiles (id),
  finalized_at timestamptz,
  unique (application_id, interview_id)
);

create index recruitment_interview_marks_application_idx on recruitment_interview_marks (application_id);

-- Counters + appointment orders ------------------------------------------

-- Same atomic-increment idiom as registration_counters/admit_student()
-- (0005) — reused here for both application numbers and appointment order
-- numbers.
create table recruitment_counters (
  college_id uuid not null references colleges (id) on delete cascade,
  academic_year int not null,
  counter_type text not null,   -- 'application' | 'appointment_order'
  last_seq int not null default 0,
  primary key (college_id, academic_year, counter_type)
);

create table recruitment_appointment_orders (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references recruitment_applications (id) on delete cascade,
  order_number text not null unique,
  issued_date date not null default current_date,
  terms_and_conditions text,
  reporting_instructions text,
  joining_deadline date,
  authorized_officer_name text not null,
  authorized_officer_title text not null,
  generated_by uuid not null references profiles (id),
  generated_at timestamptz not null default now()
);

create index recruitment_appointment_orders_application_idx on recruitment_appointment_orders (application_id);
