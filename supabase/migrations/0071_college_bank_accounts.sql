-- Fee voucher redesign: the bank account number(s) printed on a voucher
-- must be dynamic, entered by real staff (principal/accountant), not
-- hardcoded in application code — bank details can change, and hardcoding
-- them would require a code deployment to update. A dedicated table (not
-- N columns on `colleges`) since a college may print against more than one
-- bank account, matching the real-world reference this was modeled on
-- (which shows two: HBL + BOK).

create table college_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges (id) on delete cascade,
  bank_name text not null,
  account_title text,
  account_number text not null,
  sort_order int not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index college_bank_accounts_college_idx on college_bank_accounts (college_id);

create trigger college_bank_accounts_set_updated_at
  before update on college_bank_accounts
  for each row execute function set_updated_at();

alter table college_bank_accounts enable row level security;

-- Readable by anyone authenticated — these numbers are meant to be printed
-- on every student's voucher, not sensitive in the way payment status is.
create policy "college_bank_accounts_select_authenticated" on college_bank_accounts
  for select to authenticated using (true);

-- Writable by admin, principal, or the Accountant (administration role),
-- scoped to their own college — matches "principal and accountant will
-- send dynamic" (the requester's own words) plus admin as this app's usual
-- superuser escape hatch.
create policy "college_bank_accounts_write_scoped" on college_bank_accounts
  for all to authenticated
  using (
    current_user_role() = 'admin'
    or (current_user_role() in ('principal', 'administration', 'college_admin') and college_id = current_college_id())
  )
  with check (
    current_user_role() = 'admin'
    or (current_user_role() in ('principal', 'administration', 'college_admin') and college_id = current_college_id())
  );
