-- HOD/accountant-issued custom vouchers (repeat paper, degree fee, etc.) —
-- not tied to a promotion or admission, unlike every voucher so far.
-- Reuses the exact same fee_vouchers/fee_voucher_components engine and
-- verification path (bank-import matching, manual resolve) — no new
-- payment workflow, just a third way to originate a voucher.

alter table fee_vouchers alter column fee_structure_id drop not null;
alter table fee_vouchers add column is_custom boolean not null default false;
alter table fee_vouchers add column custom_reason text;

alter table fee_vouchers drop constraint fee_vouchers_exactly_one_source;
alter table fee_vouchers add constraint fee_vouchers_exactly_one_source check (
  (promotion_id is not null and admission_id is null and not is_custom)
  or (admission_id is not null and promotion_id is null and not is_custom)
  or (is_custom and promotion_id is null and admission_id is null and student_profile_id is not null)
);

-- Mirrors generate_fee_voucher()'s shape (0061/0076) but skips the
-- fee-structure lookup entirely — the caller supplies the line items
-- directly, same jsonb shape upsert_fee_structure() already accepts.
create or replace function generate_custom_fee_voucher(p_student_profile_id uuid, p_reason text, p_components jsonb)
returns fee_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher fee_vouchers;
  v_total numeric;
  v_year int;
  v_seq int;
  v_component jsonb;
begin
  if current_user_role() = 'admin' then
    if profile_college_id(p_student_profile_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif current_user_role() = 'administration' then
    if profile_college_id(p_student_profile_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif current_user_role() in ('department', 'focal_person_intermediate') then
    if (select department_id from profiles where id = p_student_profile_id) <> current_department_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;
  if p_components is null or jsonb_array_length(p_components) = 0 then
    raise exception 'at_least_one_component_required';
  end if;

  select coalesce(sum((c ->> 'amount')::numeric), 0) into v_total
  from jsonb_array_elements(p_components) c;

  v_year := extract(year from now())::int;
  insert into fee_voucher_counters (academic_year, last_seq)
  values (v_year, 1)
  on conflict (academic_year)
  do update set last_seq = fee_voucher_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into fee_vouchers (
    voucher_number, student_profile_id, is_custom, custom_reason,
    total_amount, status, due_date, generated_by
  ) values (
    'GPGC-FEE-' || v_year || '-' || lpad(v_seq::text, 4, '0'),
    p_student_profile_id, true, p_reason,
    v_total, 'unpaid', (now() + interval '14 days')::date, auth.uid()
  ) returning * into v_voucher;

  for v_component in select * from jsonb_array_elements(p_components) loop
    insert into fee_voucher_components (fee_voucher_id, name, amount, sort_order)
    values (v_voucher.id, v_component ->> 'name', (v_component ->> 'amount')::numeric,
      coalesce((v_component ->> 'sort_order')::int, 0));
  end loop;

  return v_voucher;
end;
$$;

-- process_fee_bank_import() (current source 0066): extend the post-match
-- branch with a third case for is_custom vouchers, which don't gate a
-- promotion or admission, so there's nothing downstream to clear.
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

    if v_voucher.is_custom then
      null; -- custom vouchers don't gate a promotion or admission
    elsif v_voucher.promotion_id is not null then
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

-- manually_resolve_fee_voucher() (current source 0066): same is_custom
-- branch added to both the scope check and the post-verify clear_* call.
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
  if v_voucher.is_custom then
    if profile_college_id(v_voucher.student_profile_id) <> current_college_id() then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif v_voucher.promotion_id is not null then
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
    if v_voucher.is_custom then
      null;
    elsif v_voucher.promotion_id is not null then
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
