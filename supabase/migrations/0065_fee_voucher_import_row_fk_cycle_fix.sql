-- Real bug found during live verification of Fee Management Phase 1:
-- fee_vouchers.matched_bank_row_id (0063) and
-- fee_bank_import_rows.matched_voucher_id (0061/0063) reference each other
-- with no ON DELETE behavior on either side — a genuine circular foreign
-- key dependency. Once a voucher is matched to an import row, NEITHER row
-- can ever be deleted again (each blocks the other), in production, not
-- just in test cleanup. Confirmed live: deleting the voucher first, the
-- import row first, the promotion, or the fee structure all fail with
-- 23503 in a loop.
--
-- Fix: break the cycle at fee_vouchers.matched_bank_row_id, since it's
-- only a convenience backlink to "which bank row verified this voucher" —
-- fee_bank_import_rows.matched_voucher_id is the authoritative forward
-- reference from the reconciliation record to the voucher it matched, and
-- import history is meant to be permanent (spec's audit-trail
-- requirement), so it should never be the side that gets nulled out.

alter table fee_vouchers drop constraint fee_vouchers_matched_bank_row_id_fkey;
alter table fee_vouchers
  add constraint fee_vouchers_matched_bank_row_id_fkey
  foreign key (matched_bank_row_id) references fee_bank_import_rows (id) on delete set null;
