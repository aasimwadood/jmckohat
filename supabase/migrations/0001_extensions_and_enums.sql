-- Extensions
create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------

-- Single canonical role vocabulary. The legacy frontend had a second,
-- drifted vocabulary ("hod", "accountant") layered on top of this one for
-- UI labeling only — that distinction is presentation-only from here on,
-- never a second code path. See docs/MIGRATION_PLAN.md §"Role vocabulary".
create type user_role as enum (
  'admin',
  'faculty',
  'student',
  'department',    -- Head of Department (HoD)
  'controller',    -- Controller of Examinations
  'coordinator',
  'principal',
  'administration' -- Accountant / Administration staff
);

create type admission_status as enum (
  'pending',
  'fee_approved',
  'admitted',
  'canceled'
);

create type promotion_status as enum (
  'pending_registration',
  'registration_complete',
  'fee_pending',
  'promoted'
);

create type fyp_group_status as enum (
  'supervisor_pending',
  'proposal_pending',
  'proposal_approved',
  'in_progress',
  'mid_semester_review',
  'final_submission',
  'completed',
  'archived'
);

create type fyp_deliverable_type as enum (
  'proposal',
  'progress_report',
  'final_report',
  'source_code',
  'demo_video',
  'slides'
);

create type announcement_scope as enum (
  'institution',
  'department',
  'course'
);

create type material_type as enum (
  'lecture_slides',
  'notes',
  'assignment',
  'reference',
  'other'
);

create type enrollment_status as enum (
  'active',
  'completed',
  'dropped'
);
