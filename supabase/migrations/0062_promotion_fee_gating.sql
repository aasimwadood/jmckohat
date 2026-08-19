-- Fee Management Phase 1, part 2: reorder the promotion state machine so
-- fee verification happens BEFORE course registration, not after.
--
-- Today (register_for_promotion / verify_promotion_fee, both re-created
-- most recently in 0047): a promotion starts at 'pending_registration',
-- register_for_promotion() lets the student register courses and moves it
-- to 'registration_complete', and only THEN does verify_promotion_fee()
-- (administration typing a receipt number) move it to 'promoted'. That is
-- the exact opposite of "course registration must be blocked until fee is
-- paid" — students could register courses with no fee involvement at all.
--
-- promotion_status already has a 'fee_pending' value that has never been
-- referenced by any RPC, action, or UI since the enum was created — this
-- migration puts it to use as the new first state:
--
--   fee_pending --(clear_promotion_fee, via a verified voucher)-->
--   pending_registration --(register_for_promotion, UNCHANGED)-->
--   registration_complete --(verify_promotion_fee, UNCHANGED body)-->
--   promoted
--
-- register_for_promotion's own guard (status = 'pending_registration')
-- doesn't change at all — it becomes unreachable until fee clears purely
-- as a side effect of promotions no longer starting there. That RPC-level
-- guard is the actual backend enforcement; no frontend button hiding does
-- any of the real work.

alter table promotions alter column status set default 'fee_pending';

-- Internal transition, called only from clear_promotion_fee's callers
-- (process_fee_bank_import in 0063, and manually_clear_promotion_fee
-- below) — never invoked directly by client code, so it re-validates both
-- sides of the link (the promotion is actually awaiting fee, and the
-- voucher handed in is actually verified and actually belongs to this
-- promotion) rather than trusting its caller.
create or replace function clear_promotion_fee(p_promotion_id uuid, p_voucher_id uuid)
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
  v_voucher fee_vouchers;
begin
  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;
  if v_promotion.status <> 'fee_pending' then
    raise exception 'invalid_status: promotion must be fee_pending, got %', v_promotion.status;
  end if;

  select * into v_voucher from fee_vouchers where id = p_voucher_id;
  if not found or v_voucher.promotion_id <> p_promotion_id then
    raise exception 'voucher_does_not_match_promotion';
  end if;
  if v_voucher.status <> 'verified' then
    raise exception 'invalid_status: voucher must be verified, got %', v_voucher.status;
  end if;

  update promotions set status = 'pending_registration'
  where id = p_promotion_id
  returning * into v_promotion;

  return v_promotion;
end;
$$;

-- Controlled manual override (spec §39) for edge cases a bank-Excel match
-- can't cover (voucher lost, cash payment taken at the counter, etc.) —
-- administration/admin only, reason required, audit-logged by the calling
-- Server Action. Distinct from clear_promotion_fee: this path doesn't
-- require an already-verified voucher, only that one exists, since the
-- override IS the verification. It marks the voucher verified too, so the
-- student's own fee status page reflects the same override consistently.
create or replace function manually_clear_promotion_fee(p_promotion_id uuid, p_reason text)
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
  v_voucher fee_vouchers;
begin
  if current_user_role() not in ('administration', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;
  if v_promotion.status <> 'fee_pending' then
    raise exception 'invalid_status: promotion must be fee_pending, got %', v_promotion.status;
  end if;

  select * into v_voucher from fee_vouchers where promotion_id = p_promotion_id;
  if not found then
    raise exception 'no_voucher_generated_yet';
  end if;
  if v_voucher.status = 'canceled' then
    raise exception 'voucher_is_canceled';
  end if;

  update fee_vouchers
  set status = 'verified', verified_by = auth.uid(), verified_at = now()
  where id = v_voucher.id;

  update promotions set status = 'pending_registration'
  where id = p_promotion_id
  returning * into v_promotion;

  return v_promotion;
end;
$$;

-- verify_promotion_fee is repurposed, not removed: it already only ever
-- performed the registration_complete -> promoted transition + stamped
-- profiles.current_semester_id. Since fee clearance now happens upstream
-- (fee_pending -> pending_registration, above), this step carries no fee
-- semantics anymore — it's purely "finalize this promotion." Kept under
-- its existing name for minimal blast radius; the receipt number becomes
-- optional since the voucher/bank-match system is the real record now.
-- The Server Action layer wraps this as finalizePromotionAction (renamed
-- from verifyPromotionFeeAction) and the UI relabels it "Finalize
-- Promotion" — see lib/actions/fees.ts and promotions-view.tsx.
create or replace function verify_promotion_fee(p_promotion_id uuid, p_receipt_number text default null)
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
begin
  if current_user_role() not in ('administration', 'admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;
  if profile_college_id(v_promotion.student_profile_id) <> current_college_id() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_promotion.status <> 'registration_complete' then
    raise exception 'invalid_status: promotion must be registration_complete, got %', v_promotion.status;
  end if;

  update promotions
  set status = 'promoted',
      fee_receipt_number = p_receipt_number,
      fee_verified_by = auth.uid(),
      fee_verified_at = now()
  where id = p_promotion_id
  returning * into v_promotion;

  update profiles set current_semester_id = v_promotion.to_semester_id
  where id = v_promotion.student_profile_id;

  return v_promotion;
end;
$$;
