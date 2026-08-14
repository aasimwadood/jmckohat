-- FeeStructurePage.tsx renders one row per program with admission/tuition/
-- total amounts, grouped by category — not the generic fee_head/amount
-- guessed in 0009.
alter table program_fees
  drop column fee_head,
  drop column amount,
  add column program_name text not null default '',
  add column admission_fee numeric not null default 0,
  add column tuition_fee numeric not null default 0,
  add column total_fee numeric not null default 0;
alter table program_fees alter column program_name drop default;
