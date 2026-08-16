-- Bulk-importing real, already-enrolled CS students (GPGC Kohat, batches
-- FALL-2022 through FALL-2025) surfaced a real data gap: profiles had
-- nowhere to store a student's actual college-issued registration number
-- (distinct from the auto-generated GPCK-... format admit_student() assigns
-- new admissions, and distinct from the login username, even though this
-- import reuses the reg no as both), father's name, degree program, or
-- entry-cohort batch. None of these existed anywhere on profiles before.

alter table profiles add column registration_number text;
create unique index profiles_registration_number_unique_idx
  on profiles (registration_number) where registration_number is not null;

alter table profiles add column father_name text;

alter table profiles add column program_id uuid references programs (id) on delete set null;
create index profiles_program_id_idx on profiles (program_id);

alter table profiles add column batch text;
