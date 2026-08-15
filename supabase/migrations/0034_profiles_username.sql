-- Login is switching from email to username. Added nullable + backfilled
-- first (this migration), then set NOT NULL once every existing row has
-- one (0035) — the usual two-step pattern for a new required column on a
-- populated table.
alter table profiles add column username text;
create unique index profiles_username_unique_idx on profiles (username) where username is not null;
