-- setHeadOfDepartmentAction (lib/actions/designations.ts) lets the
-- Principal set departments.hod_profile_id, but departments_write_admin
-- was still admin-only (never broadened when college_id/college_admin
-- were added elsewhere) — RLS would have silently rejected every real
-- Principal attempt despite the app-layer requireRole("principal", "admin")
-- letting them into the action at all. Same additive-OR pattern as every
-- other college-scoped write policy this session.
drop policy "departments_write_admin" on departments;
create policy "departments_write_admin" on departments
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() in ('principal', 'college_admin') and college_id = current_college_id())
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() in ('principal', 'college_admin') and college_id = current_college_id())
  );
