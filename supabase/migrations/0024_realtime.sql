-- Enables Postgres Changes broadcasts for tables where multiple roles
-- genuinely watch the same data change live: notifications (personal
-- alerts), announcements (new posts), admissions (HoD/faculty/
-- administration all watch the same queue as it moves through fee
-- verification), fyp_groups/fyp_proposals (student + supervisor watching
-- the same group's status), and timetable_entries (coordinator edits that
-- students/faculty should see without a manual refresh). Supabase Realtime
-- enforces the same RLS policies already defined on these tables, so a
-- subscriber only ever receives rows they could already SELECT.
alter publication supabase_realtime add table
  notifications,
  announcements,
  admissions,
  fyp_groups,
  fyp_proposals,
  timetable_entries;
