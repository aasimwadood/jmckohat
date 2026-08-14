-- HowToApplyPage.tsx renders an icon+color per step, and important dates
-- as an event with a start/end date range — not modeled in 0009's guess.
alter table apply_steps
  add column icon text,
  add column color text;

alter table important_dates
  drop column label,
  drop column event_date,
  add column event text not null default '',
  add column start_date date,
  add column end_date date;
alter table important_dates alter column event drop default;
