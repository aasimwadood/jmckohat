-- Real bug found during live verification of Fee Management Phase 2:
-- 0066 made fee_vouchers.promotion_id nullable and added admission_id, but
-- left student_profile_id NOT NULL (from its original 0061 definition) —
-- an admission-linked voucher generated before the applicant has an
-- account (student_profile_id genuinely null) violated that constraint on
-- every insert.

alter table fee_vouchers alter column student_profile_id drop not null;
