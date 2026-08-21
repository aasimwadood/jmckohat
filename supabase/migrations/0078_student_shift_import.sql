-- Shift Management, Phase 7: CSV import for bulk shift/group/section
-- assignment — a structural copy of the bank-Excel-import architecture
-- (0063/0064/0065) applied to a different column format. Same split this
-- app uses everywhere for this class of feature: untrusted I/O (parsing,
-- validation) happens in Node (lib/actions/student-shift-imports.ts, using
-- exceljs — already the only spreadsheet-parsing library in this repo),
-- trust-sensitive writes happen in a SECURITY DEFINER function below.
--
-- Deliberately different from process_fee_bank_import() in one respect:
-- processing here is per-row best-effort (never all-or-nothing) — a CSV is
-- unreliable external data, so one bad row (typo'd registration number,
-- misspelled shift code) must not void the rest of the batch. This mirrors
-- process_fee_bank_import()'s own reasoning exactly, and is deliberately
-- different from Phase 3's bulk_assign_student_shift/placement (0077),
-- which are fail-closed because that caller hand-picks known-good students
-- from a checkbox UI, so any mismatch there is a bug/tampering signal, not
-- ordinary data noise.
--
-- The UPDATE-policy gap that 0064 had to fix as a separate live-bug-fix
-- migration is built in from the start here (see
-- student_shift_imports_update_preview_scoped below).

create type student_import_status as enum ('uploaded', 'previewed', 'completed');
create type student_import_row_status as enum ('valid', 'invalid', 'applied', 'skipped');

create table student_shift_imports (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references colleges (id),
  uploaded_by uuid references profiles (id),
  original_filename text not null,
  file_path text,
  file_hash text not null,
  status student_import_status not null default 'uploaded',
  total_rows int not null default 0,
  valid_rows int not null default 0,
  invalid_rows int not null default 0,
  applied_rows int not null default 0,
  skipped_rows int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Duplicate-upload guard: the same file re-uploaded is rejected before
  -- it ever reaches Storage, matching fee_bank_imports exactly.
  unique (file_hash)
);

create index student_shift_imports_college_idx on student_shift_imports (college_id);

create table student_shift_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references student_shift_imports (id) on delete cascade,
  row_number int not null,
  registration_number text,
  shift_code text,
  group_code text,
  section_code text,
  status student_import_row_status not null default 'valid',
  error_message text,
  matched_student_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index student_shift_import_rows_import_idx on student_shift_import_rows (import_id);
create index student_shift_import_rows_registration_idx on student_shift_import_rows (registration_number);

-- Storage --------------------------------------------------------------
-- Path convention: student-shift-imports/{import_id}/{filename} — the
-- import row is always created first, so the folder id always resolves to
-- a real row for the policy check below (same ordering as fee-bank-imports).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-shift-imports', 'student-shift-imports', false, 2097152,
  array['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
on conflict (id) do nothing;

create policy "student_shift_imports_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'student-shift-imports'
    and exists (
      select 1 from student_shift_imports i
      where i.id = ((storage.foldername(name))[1])::uuid
        and current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
        and i.college_id = current_college_id()
    )
  );
create policy "student_shift_imports_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-shift-imports'
    and exists (
      select 1 from student_shift_imports i
      where i.id = ((storage.foldername(name))[1])::uuid
        and current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
        and i.college_id = current_college_id()
    )
  );

-- Business logic ---------------------------------------------------------

-- Processes every 'valid' row of an already-previewed import, best-effort:
-- each row gets its own terminal status and a bad row never aborts the
-- batch. The caller's own authority scope is re-verified per row rather
-- than trusted from the file — a department/focal_person_intermediate
-- caller can only ever resolve/write students within their own
-- department_id (mirroring bulk_assign_student_shift's department-match
-- check, 0077), regardless of what registration number the file claims.
create or replace function process_student_shift_import(p_import_id uuid)
returns student_shift_imports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import student_shift_imports;
  v_row record;
  v_student profiles;
  v_shift_id uuid;
  v_group_id uuid;
  v_section_id uuid;
  v_applied int := 0;
  v_skipped int := 0;
begin
  if current_user_role() not in ('admin', 'principal', 'department', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_import from student_shift_imports where id = p_import_id for update;
  if not found then
    raise exception 'import_not_found';
  end if;
  if v_import.college_id <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_import.status <> 'previewed' then
    raise exception 'invalid_status: import must be previewed, got %', v_import.status;
  end if;

  for v_row in select * from student_shift_import_rows where import_id = p_import_id and status = 'valid' for update loop
    v_shift_id := null;
    v_group_id := null;
    v_section_id := null;

    select * into v_student from profiles
    where registration_number = v_row.registration_number and role = 'student';
    if not found or profile_college_id(v_student.id) <> v_import.college_id then
      update student_shift_import_rows set status = 'skipped', error_message = 'student_not_found' where id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;
    if current_user_role() in ('department', 'focal_person_intermediate') and v_student.department_id <> current_department_id() then
      update student_shift_import_rows set status = 'skipped', error_message = 'student_not_found' where id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_row.shift_code is not null then
      select id into v_shift_id from shifts where college_id = v_import.college_id and code = v_row.shift_code;
      if v_shift_id is null then
        update student_shift_import_rows set status = 'skipped', error_message = 'shift_not_found' where id = v_row.id;
        v_skipped := v_skipped + 1;
        continue;
      end if;
    end if;

    if v_row.group_code is not null then
      select id into v_group_id from groups where department_id = v_student.department_id and code = v_row.group_code;
      if v_group_id is null then
        update student_shift_import_rows set status = 'skipped', error_message = 'group_not_found' where id = v_row.id;
        v_skipped := v_skipped + 1;
        continue;
      end if;
    end if;

    if v_row.section_code is not null then
      if v_group_id is null then
        update student_shift_import_rows set status = 'skipped', error_message = 'section_requires_group' where id = v_row.id;
        v_skipped := v_skipped + 1;
        continue;
      end if;
      select id into v_section_id from sections where group_id = v_group_id and code = v_row.section_code;
      if v_section_id is null then
        update student_shift_import_rows set status = 'skipped', error_message = 'section_not_in_group' where id = v_row.id;
        v_skipped := v_skipped + 1;
        continue;
      end if;
    end if;

    update profiles
    set shift_id = coalesce(v_shift_id, shift_id),
        group_id = coalesce(v_group_id, group_id),
        section_id = coalesce(v_section_id, section_id)
    where id = v_student.id;

    update student_shift_import_rows set status = 'applied', matched_student_id = v_student.id where id = v_row.id;
    v_applied := v_applied + 1;
  end loop;

  update student_shift_imports
  set status = 'completed',
      applied_rows = v_applied,
      skipped_rows = v_skipped,
      completed_at = now()
  where id = p_import_id
  returning * into v_import;

  return v_import;
end;
$$;

-- RLS ---------------------------------------------------------------------

alter table student_shift_imports enable row level security;
alter table student_shift_import_rows enable row level security;

create policy "student_shift_imports_select_scoped" on student_shift_imports
  for select to authenticated
  using (
    current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
    and college_id = current_college_id()
  );
create policy "student_shift_imports_insert_scoped" on student_shift_imports
  for insert to authenticated
  with check (
    current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
    and college_id = current_college_id()
  );
-- Narrow UPDATE policy permitting only the uploaded -> previewed
-- transition (built in from the start — see header comment; 0064 had to
-- add this as a separate live-bug-fix for fee_bank_imports).
create policy "student_shift_imports_update_preview_scoped" on student_shift_imports
  for update to authenticated
  using (
    current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
    and college_id = current_college_id()
    and status = 'uploaded'
  )
  with check (
    current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
    and college_id = current_college_id()
    and status = 'previewed'
  );
-- previewed -> completed only ever happens inside process_student_shift_import().

create policy "student_shift_import_rows_select_scoped" on student_shift_import_rows
  for select to authenticated
  using (
    exists (
      select 1 from student_shift_imports i
      where i.id = import_id
        and current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
        and i.college_id = current_college_id()
    )
  );
create policy "student_shift_import_rows_insert_scoped" on student_shift_import_rows
  for insert to authenticated
  with check (
    exists (
      select 1 from student_shift_imports i
      where i.id = import_id
        and current_user_role() in ('admin', 'principal', 'department', 'focal_person_intermediate')
        and i.college_id = current_college_id()
    )
  );
-- No UPDATE policy: row status only changes via process_student_shift_import().
