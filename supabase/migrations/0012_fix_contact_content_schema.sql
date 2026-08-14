-- More corrections from reading the actual legacy pages closely while
-- porting them (Phase 7) — see 0011 for the same pattern. All three tables
-- are still empty, safe to reshape.

alter table office_hours
  drop column day_range,
  drop column hours,
  add column day text,
  add column opening_time text,
  add column closing_time text,
  add column status text not null default 'Open';

alter table contact_info
  drop column label,
  drop column value,
  add column icon text,
  add column title text,
  add column description text,
  add column details text;

alter table campus_locations
  add column phone text,
  add column email text;
