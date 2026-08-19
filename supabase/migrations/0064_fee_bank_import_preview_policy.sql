-- Real bug found during live verification of Fee Management Phase 1:
-- fee_bank_imports has no UPDATE policy at all (0063), by design, so no
-- role could move it from 'uploaded' to 'previewed' — uploadBankImportAction
-- (lib/actions/fee-imports.ts) does that update with the normal
-- RLS-respecting client after inserting the parsed rows, and it was
-- silently affecting 0 rows (RLS-blocked updates don't raise a client-side
-- error), leaving every import stuck at 'uploaded' and process_fee_bank_import
-- permanently unreachable (it requires status = 'previewed').
--
-- Fix: a narrow UPDATE policy that permits *only* the uploaded -> previewed
-- transition (both the USING row-visibility check and the WITH CHECK
-- new-row check pin the exact status values), scoped to
-- administration/admin within their own college. Every other transition —
-- previewed -> completed in particular, the one that actually verifies
-- money — still only ever happens inside process_fee_bank_import(),
-- running as table owner (SECURITY DEFINER), never reachable through this
-- policy.

create policy "fee_bank_imports_update_preview_scoped" on fee_bank_imports
  for update to authenticated
  using (current_user_role() in ('administration', 'admin') and college_id = current_college_id() and status = 'uploaded')
  with check (current_user_role() in ('administration', 'admin') and college_id = current_college_id() and status = 'previewed');
