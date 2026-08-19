-- Fee Management Phase 2: automatic fee-voucher generation for new
-- admissions, reusing the exact same fee_structures/fee_vouchers engine
-- from Phase 1 (0061-0065) rather than building a parallel system.
--
-- Key reuse: a new admission's applicable fee structure is just
-- program_id + semester_number=1 + the active academic_session_id — the
-- same row a semester-1 promotion would resolve to, since admit_student()
-- already assigns every new admission to semester number 1 of the active
-- session. No new fee-structure modeling needed for "new admission fees."
--
-- The old admissions.{registration_fee,...} flat fields and
-- approve_admission_fee() (administration manually types a receipt
-- number, pending -> fee_approved) are left completely untouched — they
-- remain a valid manual fallback for admissions with no fee structure
-- configured yet. This migration ADDS an automated path alongside it: a
-- generated voucher, verified either by the bank-Excel matching engine or
-- a manual override, drives the exact same pending -> fee_approved
-- transition (stamping fee_approved_by/fee_paid_at/fee_receipt_number,
-- the same columns approve_admission_fee already uses) so admit_student()
-- needs no changes at all.

-- admissions has no father_name column, but the fee voucher (like the
-- existing promotion-linked one) needs to show it — a small, targeted
-- addition scoped to what voucher generation actually needs, not the
-- spec's full new-admission field list (DOB/gender/address/domicile/...),
-- which is a separate, larger feature outside Fee Management.
alter table admissions add column father_name text;

alter table fee_vouchers alter column promotion_id drop not null;
alter table fee_vouchers add column admission_id uuid references admissions (id) on delete restrict;
alter table fee_vouchers add constraint fee_vouchers_admission_id_unique unique (admission_id);
alter table fee_vouchers add constraint fee_vouchers_exactly_one_source check (
  (promotion_id is not null and admission_id is null) or (promotion_id is null and admission_id is not null)
);

-- RLS: extend both voucher SELECT policies with an admission-linked branch
-- (student_profile_id is null on a fee_vouchers row until the admission is
-- linked to an account, so admission-linked vouchers are visible to
-- department/faculty/administration/admin/principal via the admission's
-- own department, mirroring admissions_select_scoped exactly).

drop policy "fee_vouchers_select_scoped" on fee_vouchers;
create policy "fee_vouchers_select_scoped" on fee_vouchers
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and (
        (student_profile_id is not null and profile_college_id(student_profile_id) = current_college_id())
        or (admission_id is not null and exists (
          select 1 from admissions ad where ad.id = admission_id and department_college_id(ad.department_id) = current_college_id()
        ))
      )
    )
    or (
      current_user_role() in ('department', 'faculty')
      and (
        (student_profile_id is not null and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id()))
        or (admission_id is not null and exists (select 1 from admissions ad where ad.id = admission_id and ad.department_id = current_department_id()))
      )
    )
    or (student_profile_id is not null and profile_visible_to_org_admin(student_profile_id))
  );

drop policy "fee_voucher_components_select_scoped" on fee_voucher_components;
create policy "fee_voucher_components_select_scoped" on fee_voucher_components
  for select to authenticated
  using (exists (select 1 from fee_vouchers v where v.id = fee_voucher_id));

-- Business logic, moved server-side ---------------------------------------

-- Mirrors generate_fee_voucher()'s shape (0061) but resolves department/
-- program directly from the admission (student_profile_id may not exist
-- yet) and always targets semester number 1 of the active session.
create or replace function generate_admission_fee_voucher(p_admission_id uuid)
returns fee_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_semester_id uuid;
  v_academic_session_id uuid;
  v_structure fee_structures;
  v_voucher fee_vouchers;
  v_year int;
  v_seq int;
  v_component record;
begin
  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;

  if current_user_role() = 'admin' then
    if department_college_id(v_admission.department_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif current_user_role() in ('department', 'faculty') then
    if v_admission.department_id <> current_department_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_admission.status <> 'pending' then
    raise exception 'invalid_status: admission must be pending, got %', v_admission.status;
  end if;
  if v_admission.program_id is null then
    raise exception 'admission_has_no_program_assigned';
  end if;

  select s.id, s.academic_session_id into v_semester_id, v_academic_session_id
  from semesters s join academic_sessions a on a.id = s.academic_session_id
  where a.is_active = true and s.number = 1
  limit 1;
  if v_semester_id is null then
    raise exception 'no_active_semester_one';
  end if;

  select * into v_structure from fee_structures
  where program_id = v_admission.program_id
    and semester_number = 1
    and academic_session_id = v_academic_session_id
    and status = 'active';
  if not found then
    raise exception 'no_fee_structure_configured';
  end if;

  v_year := extract(year from now())::int;
  insert into fee_voucher_counters (academic_year, last_seq)
  values (v_year, 1)
  on conflict (academic_year)
  do update set last_seq = fee_voucher_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into fee_vouchers (
    voucher_number, admission_id, student_profile_id, fee_structure_id,
    total_amount, status, due_date, generated_by
  ) values (
    'GPGC-FEE-' || v_year || '-' || lpad(v_seq::text, 4, '0'),
    p_admission_id, v_admission.student_profile_id, v_structure.id,
    v_structure.total_amount, 'unpaid', (now() + interval '14 days')::date, auth.uid()
  ) returning * into v_voucher;

  for v_component in select name, amount, sort_order from fee_structure_components where fee_structure_id = v_structure.id loop
    insert into fee_voucher_components (fee_voucher_id, name, amount, sort_order)
    values (v_voucher.id, v_component.name, v_component.amount, v_component.sort_order);
  end loop;

  return v_voucher;
end;
$$;

-- Internal transition (called only from process_fee_bank_import and
-- manually_clear_admission_fee below) — drives the exact same
-- pending -> fee_approved transition approve_admission_fee already does,
-- so admit_student()'s guard needs no changes.
create or replace function clear_admission_fee(p_admission_id uuid, p_voucher_id uuid)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_voucher fee_vouchers;
begin
  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;
  if v_admission.status <> 'pending' then
    raise exception 'invalid_status: admission must be pending, got %', v_admission.status;
  end if;

  select * into v_voucher from fee_vouchers where id = p_voucher_id;
  if not found or v_voucher.admission_id <> p_admission_id then
    raise exception 'voucher_does_not_match_admission';
  end if;
  if v_voucher.status <> 'verified' then
    raise exception 'invalid_status: voucher must be verified, got %', v_voucher.status;
  end if;

  update admissions
  set status = 'fee_approved',
      fee_receipt_number = v_voucher.voucher_number,
      fee_paid_at = now(),
      fee_approved_by = v_voucher.verified_by
  where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;

-- Controlled manual override, mirroring manually_clear_promotion_fee.
create or replace function manually_clear_admission_fee(p_admission_id uuid, p_reason text)
returns admissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission admissions;
  v_voucher fee_vouchers;
begin
  if current_user_role() not in ('administration', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select * into v_admission from admissions where id = p_admission_id for update;
  if not found then
    raise exception 'admission_not_found';
  end if;
  if v_admission.status <> 'pending' then
    raise exception 'invalid_status: admission must be pending, got %', v_admission.status;
  end if;

  select * into v_voucher from fee_vouchers where admission_id = p_admission_id;
  if not found then
    raise exception 'no_voucher_generated_yet';
  end if;
  if v_voucher.status = 'canceled' then
    raise exception 'voucher_is_canceled';
  end if;

  update fee_vouchers
  set status = 'verified', verified_by = auth.uid(), verified_at = now()
  where id = v_voucher.id;

  update admissions
  set status = 'fee_approved',
      fee_receipt_number = v_voucher.voucher_number,
      fee_paid_at = now(),
      fee_approved_by = auth.uid()
  where id = p_admission_id
  returning * into v_admission;

  return v_admission;
end;
$$;

-- process_fee_bank_import() (0063), extended to branch on which source a
-- matched voucher belongs to. Everything else is unchanged from 0063.
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

    select v.* into v_voucher from fee_vouchers v
    left join admissions ad on ad.id = v.admission_id
    where v.voucher_number = v_row.voucher_number
      and v.status = 'unpaid'
      and coalesce(profile_college_id(v.student_profile_id), department_college_id(ad.department_id)) = v_import.college_id
    for update of v;

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

    if v_voucher.promotion_id is not null then
      perform clear_promotion_fee(v_voucher.promotion_id, v_voucher.id);
    else
      perform clear_admission_fee(v_voucher.admission_id, v_voucher.id);
    end if;

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

-- manually_resolve_fee_voucher() (0063), extended so the 'verify' path
-- also clears an admission-linked voucher's admission, not just a
-- promotion-linked one.
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
  if v_voucher.promotion_id is not null then
    if profile_college_id(v_voucher.student_profile_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    if (select department_college_id(department_id) from admissions where id = v_voucher.admission_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;
  if v_voucher.status <> 'unpaid' then
    raise exception 'invalid_status: voucher must be unpaid, got %', v_voucher.status;
  end if;

  if p_action = 'verify' then
    update fee_vouchers
    set status = 'verified', verified_by = auth.uid(), verified_at = now()
    where id = p_voucher_id
    returning * into v_voucher;
    if v_voucher.promotion_id is not null then
      perform clear_promotion_fee(v_voucher.promotion_id, v_voucher.id);
    else
      perform clear_admission_fee(v_voucher.admission_id, v_voucher.id);
    end if;
  else
    update fee_vouchers
    set status = 'canceled', canceled_by = auth.uid(), canceled_at = now(), cancel_reason = p_reason
    where id = p_voucher_id
    returning * into v_voucher;
  end if;

  return v_voucher;
end;
$$;
