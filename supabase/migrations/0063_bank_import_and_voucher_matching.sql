-- Fee Management Phase 1, part 3: accountant bank-Excel upload, duplicate
-- detection, and automatic payment matching (spec §13-21, §39).
--
-- Column parsing/validation happens in Node (lib/actions/fee-imports.ts,
-- using exceljs) — only already-validated rows ever reach
-- fee_bank_import_rows. The actual money-moving matching/verification
-- logic below is SQL, same split this app already uses everywhere else
-- (admit_student, register_for_promotion): untrusted I/O in Node,
-- trust-sensitive state transitions in a SECURITY DEFINER function.

create type fee_import_status as enum ('uploaded', 'previewed', 'completed');
create type fee_import_row_status as enum ('valid', 'invalid', 'matched', 'amount_mismatch', 'unmatched', 'duplicate_row');

create table fee_bank_imports (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references colleges (id),
  uploaded_by uuid references profiles (id),
  original_filename text not null,
  file_path text,
  file_hash text not null,
  status fee_import_status not null default 'uploaded',
  total_rows int not null default 0,
  valid_rows int not null default 0,
  invalid_rows int not null default 0,
  matched_rows int not null default 0,
  mismatched_rows int not null default 0,
  unmatched_rows int not null default 0,
  duplicate_rows int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Duplicate-upload guard: the same file re-uploaded (even by a different
  -- accountant) is rejected before it ever reaches Storage.
  unique (file_hash)
);

create index fee_bank_imports_college_idx on fee_bank_imports (college_id);

create table fee_bank_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references fee_bank_imports (id) on delete cascade,
  row_number int not null,
  voucher_number text,
  student_identifier text,
  amount numeric,
  transaction_date date,
  transaction_reference text,
  status fee_import_row_status not null default 'valid',
  error_message text,
  matched_voucher_id uuid references fee_vouchers (id),
  created_at timestamptz not null default now()
);

create index fee_bank_import_rows_import_idx on fee_bank_import_rows (import_id);
create index fee_bank_import_rows_voucher_idx on fee_bank_import_rows (voucher_number);

alter table fee_vouchers add column matched_bank_row_id uuid references fee_bank_import_rows (id);

-- Storage ------------------------------------------------------------------
-- Path convention: fee-bank-imports/{import_id}/{filename} — the import
-- row is always created first (see uploadBankImportAction), so the folder
-- id always resolves to a real row for the policy check below.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fee-bank-imports', 'fee-bank-imports', false, 5242880,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
on conflict (id) do nothing;

create policy "fee_bank_imports_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fee-bank-imports'
    and exists (
      select 1 from fee_bank_imports i
      where i.id = ((storage.foldername(name))[1])::uuid
        and current_user_role() in ('administration', 'admin')
        and i.college_id = current_college_id()
    )
  );
create policy "fee_bank_imports_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fee-bank-imports'
    and exists (
      select 1 from fee_bank_imports i
      where i.id = ((storage.foldername(name))[1])::uuid
        and current_user_role() in ('administration', 'admin')
        and i.college_id = current_college_id()
    )
  );

-- Business logic, moved server-side ---------------------------------------

-- Processes every 'valid' row of an already-previewed import in one
-- transaction: matches by voucher_number, validates the amount, flags
-- reference-level duplicates against rows already matched in ANY prior
-- import, and — on a clean match — verifies the voucher and clears its
-- promotion's fee gate via clear_promotion_fee() (0062). Matching is
-- scoped to the import's own college so an accountant can never verify a
-- voucher belonging to another college's student.
create or replace function process_fee_bank_import(p_import_id uuid)
returns fee_bank_imports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import fee_bank_imports;
  v_row record;
  v_voucher fee_vouchers;
  v_matched int := 0;
  v_mismatched int := 0;
  v_unmatched int := 0;
  v_duplicate int := 0;
begin
  if current_user_role() not in ('administration', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_import from fee_bank_imports where id = p_import_id for update;
  if not found then
    raise exception 'import_not_found';
  end if;
  if v_import.college_id <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_import.status <> 'previewed' then
    raise exception 'invalid_status: import must be previewed, got %', v_import.status;
  end if;

  for v_row in select * from fee_bank_import_rows where import_id = p_import_id and status = 'valid' for update loop
    if v_row.transaction_reference is not null and exists (
      select 1 from fee_bank_import_rows r2
      where r2.transaction_reference = v_row.transaction_reference
        and r2.status = 'matched'
        and r2.id <> v_row.id
    ) then
      update fee_bank_import_rows set status = 'duplicate_row' where id = v_row.id;
      v_duplicate := v_duplicate + 1;
      continue;
    end if;

    select * into v_voucher from fee_vouchers
    where voucher_number = v_row.voucher_number
      and status = 'unpaid'
      and profile_college_id(student_profile_id) = v_import.college_id
    for update;

    if not found then
      update fee_bank_import_rows set status = 'unmatched' where id = v_row.id;
      v_unmatched := v_unmatched + 1;
      continue;
    end if;

    if v_voucher.total_amount <> v_row.amount then
      update fee_bank_import_rows set status = 'amount_mismatch' where id = v_row.id;
      v_mismatched := v_mismatched + 1;
      continue;
    end if;

    update fee_vouchers
    set status = 'verified', verified_by = auth.uid(), verified_at = now(), matched_bank_row_id = v_row.id
    where id = v_voucher.id;

    perform clear_promotion_fee(v_voucher.promotion_id, v_voucher.id);

    update fee_bank_import_rows set status = 'matched', matched_voucher_id = v_voucher.id where id = v_row.id;
    v_matched := v_matched + 1;
  end loop;

  update fee_bank_imports
  set status = 'completed',
      matched_rows = v_matched,
      mismatched_rows = v_mismatched,
      unmatched_rows = v_unmatched,
      duplicate_rows = v_duplicate,
      completed_at = now()
  where id = p_import_id
  returning * into v_import;

  return v_import;
end;
$$;

-- Manual resolution for rows/vouchers the automatic pass couldn't clear
-- (spec §39: requires an authorized role + a reason, audit-logged by the
-- calling Server Action). 'verify' also clears the linked promotion's fee
-- gate; 'cancel' just closes out the voucher (e.g. a bogus/duplicate
-- voucher that should never be paid against).
create or replace function manually_resolve_fee_voucher(p_voucher_id uuid, p_action text, p_reason text)
returns fee_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher fee_vouchers;
begin
  if current_user_role() not in ('administration', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_action not in ('verify', 'cancel') then
    raise exception 'invalid_action';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select * into v_voucher from fee_vouchers where id = p_voucher_id for update;
  if not found then
    raise exception 'voucher_not_found';
  end if;
  if profile_college_id(v_voucher.student_profile_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_voucher.status <> 'unpaid' then
    raise exception 'invalid_status: voucher must be unpaid, got %', v_voucher.status;
  end if;

  if p_action = 'verify' then
    update fee_vouchers
    set status = 'verified', verified_by = auth.uid(), verified_at = now()
    where id = p_voucher_id
    returning * into v_voucher;
    perform clear_promotion_fee(v_voucher.promotion_id, v_voucher.id);
  else
    update fee_vouchers
    set status = 'canceled', canceled_by = auth.uid(), canceled_at = now(), cancel_reason = p_reason
    where id = p_voucher_id
    returning * into v_voucher;
  end if;

  return v_voucher;
end;
$$;

-- RLS ---------------------------------------------------------------------

alter table fee_bank_imports enable row level security;
alter table fee_bank_import_rows enable row level security;

create policy "fee_bank_imports_select_scoped" on fee_bank_imports
  for select to authenticated
  using (current_user_role() in ('administration', 'admin') and college_id = current_college_id());
create policy "fee_bank_imports_insert_scoped" on fee_bank_imports
  for insert to authenticated
  with check (current_user_role() in ('administration', 'admin') and college_id = current_college_id());
-- No UPDATE policy: status/counts only change via process_fee_bank_import()
-- above, running as table owner.

create policy "fee_bank_import_rows_select_scoped" on fee_bank_import_rows
  for select to authenticated
  using (
    exists (
      select 1 from fee_bank_imports i
      where i.id = import_id and current_user_role() in ('administration', 'admin') and i.college_id = current_college_id()
    )
  );
create policy "fee_bank_import_rows_insert_scoped" on fee_bank_import_rows
  for insert to authenticated
  with check (
    exists (
      select 1 from fee_bank_imports i
      where i.id = import_id and current_user_role() in ('administration', 'admin') and i.college_id = current_college_id()
    )
  );
-- No UPDATE policy: row status only changes via process_fee_bank_import().
