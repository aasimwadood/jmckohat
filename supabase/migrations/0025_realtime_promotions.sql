-- Promotions is watched by three different roles as it moves through its
-- lifecycle (HoD starts a cycle, student registers courses, administration
-- verifies fee and triggers the actual promotion) — missed in 0024,
-- added here.
alter publication supabase_realtime add table promotions;
