-- Real bug found live-verifying Fee Management through the actual browser
-- UI, not RPC/RLS calls: every <LiveRefresh table="fee_vouchers"/"fee_bank_imports"/...>
-- added across this feature (student fees, department fees, accountant
-- finance overview, bank import) has been silently non-functional the
-- whole time — none of these tables were ever added to the
-- supabase_realtime publication (the omission 0024/0025 already
-- established the pattern for: notifications, announcements, admissions,
-- fyp_groups, fyp_proposals, timetable_entries, promotions). A subscriber
-- calling .channel(...).on('postgres_changes', ...) on an unpublished
-- table subscribes successfully but never receives an event — no error,
-- just silence, which is why this wasn't caught by build/lint/tsc and
-- only surfaced watching a real page fail to update after a real click.
--
-- fee_vouchers is the one multiple roles genuinely watch concurrently
-- (student sees their own status flip, department/administration/principal
-- watch the same data as a bank import processes it), matching 0024's own
-- stated criterion. fee_structures and fee_bank_imports are added too,
-- since this feature already has LiveRefresh instances pointed at both.

alter publication supabase_realtime add table fee_vouchers, fee_structures, fee_bank_imports, fee_bank_import_rows;
