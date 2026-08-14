-- ProgramsPage.tsx renders credit hours, eligibility, and a comma-separated
-- specializations list per program — not modeled in 0009's initial guess.
alter table program_details
  add column credit_hours int,
  add column eligibility text,
  add column specializations text;
