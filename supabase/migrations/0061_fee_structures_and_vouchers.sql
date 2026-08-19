-- Fee Management Phase 1, part 1: configurable fee structures + vouchers
-- for BS existing/promoted students (spec §5-12, §37-38, §41-42).
--
-- `fee_vouchers` is the new authoritative record for BS promotion-cycle
-- semester fees — it does NOT replace `fee_payments` (the ad-hoc ledger for
-- hostel/transport/other one-off fee types) or `admissions`' own one-time
-- fee line items, both of which are untouched by this migration.

create type fee_structure_status as enum ('draft', 'active', 'archived');

-- Only the transitions actually implemented by the RPCs in this and the
-- following two migrations — no unused values (see 0006's `fee_pending`,
-- which sat dead for years before this feature repurposed it in 0062).
create type fee_voucher_status as enum ('unpaid', 'verified', 'canceled');

-- Fee structures --------------------------------------------------------
-- Keyed by semester *number* (not a specific semesters.id) + academic
-- session, matching how startPromotionCycleAction already resolves a
-- student's next semester (by number within the same session) and letting
-- one structure be authored per program/semester each session without a
-- copy-forward step when a new session starts.

create table fee_structures (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  semester_number int not null check (semester_number between 1 and 8),
  academic_session_id uuid not null references academic_sessions (id) on delete cascade,
  status fee_structure_status not null default 'draft',
  total_amount numeric not null default 0 check (total_amount >= 0),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, semester_number, academic_session_id)
);

create index fee_structures_program_idx on fee_structures (program_id);

create trigger fee_structures_set_updated_at
  before update on fee_structures
  for each row execute function set_updated_at();

create table fee_structure_components (
  id uuid primary key default gen_random_uuid(),
  fee_structure_id uuid not null references fee_structures (id) on delete cascade,
  name text not null,
  amount numeric not null check (amount >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index fee_structure_components_structure_idx on fee_structure_components (fee_structure_id);

-- Fee vouchers ------------------------------------------------------------
-- Money-moving table: no blanket UPDATE policy for any role below (admin
-- included, unlike departments/promotions' own admin escape hatch) — every
-- status transition goes through generate_fee_voucher() (this migration),
-- process_fee_bank_import()/manually_resolve_fee_voucher() (0063), or
-- clear_promotion_fee()/manually_clear_promotion_fee() (0062), all
-- SECURITY DEFINER and independently role-checked.

create table fee_vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_number text not null unique,
  promotion_id uuid not null unique references promotions (id) on delete restrict,
  student_profile_id uuid not null references profiles (id) on delete cascade,
  fee_structure_id uuid not null references fee_structures (id),
  total_amount numeric not null check (total_amount >= 0),
  status fee_voucher_status not null default 'unpaid',
  due_date date not null,
  generated_by uuid references profiles (id),
  generated_at timestamptz not null default now(),
  verified_by uuid references profiles (id),
  verified_at timestamptz,
  canceled_by uuid references profiles (id),
  canceled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fee_vouchers_student_idx on fee_vouchers (student_profile_id);
create index fee_vouchers_status_idx on fee_vouchers (status);

create trigger fee_vouchers_set_updated_at
  before update on fee_vouchers
  for each row execute function set_updated_at();

-- Snapshot of fee_structure_components taken at generation time, so a
-- later edit to the structure never retroactively changes an issued
-- voucher (spec §9's "voucher should not be editable").
create table fee_voucher_components (
  id uuid primary key default gen_random_uuid(),
  fee_voucher_id uuid not null references fee_vouchers (id) on delete cascade,
  name text not null,
  amount numeric not null,
  sort_order int not null default 0
);

create index fee_voucher_components_voucher_idx on fee_voucher_components (fee_voucher_id);

-- Atomic per-year sequence, same pattern as registration_counters (used by
-- admit_student()) — backs voucher numbers formatted GPGC-FEE-{year}-{seq}.
create table fee_voucher_counters (
  academic_year int primary key,
  last_seq int not null default 0
);

-- Business logic, moved server-side ---------------------------------------

-- Config write, not money-moving — a direct RPC (rather than plain RLS
-- table policies) so the structure + its components replace atomically in
-- one transaction, same reasoning as any multi-table upsert in this app.
create or replace function upsert_fee_structure(
  p_program_id uuid,
  p_semester_number int,
  p_academic_session_id uuid,
  p_components jsonb -- [{"name": "Tuition Fee", "amount": 12000}, ...]
)
returns fee_structures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_structure fee_structures;
  v_total numeric;
  v_component jsonb;
begin
  if current_user_role() = 'admin' then
    null;
  elsif current_user_role() = 'principal'
    and department_college_id((select department_id from programs where id = p_program_id)) = current_college_id() then
    null;
  else
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if p_components is null or jsonb_array_length(p_components) = 0 then
    raise exception 'at_least_one_component_required';
  end if;

  select coalesce(sum((c ->> 'amount')::numeric), 0) into v_total
  from jsonb_array_elements(p_components) c;

  insert into fee_structures (program_id, semester_number, academic_session_id, status, total_amount, created_by)
  values (p_program_id, p_semester_number, p_academic_session_id, 'active', v_total, auth.uid())
  on conflict (program_id, semester_number, academic_session_id)
  do update set total_amount = excluded.total_amount, status = 'active', updated_at = now()
  returning * into v_structure;

  delete from fee_structure_components where fee_structure_id = v_structure.id;

  for v_component in select * from jsonb_array_elements(p_components) loop
    insert into fee_structure_components (fee_structure_id, name, amount, sort_order)
    values (v_structure.id, v_component ->> 'name', (v_component ->> 'amount')::numeric,
      coalesce((v_component ->> 'sort_order')::int, 0));
  end loop;

  return v_structure;
end;
$$;

-- Generates a voucher for a promotion that's awaiting fee (status =
-- 'fee_pending', see 0062). Callable by the student themselves, or by
-- department/admin scoped exactly like register_for_promotion already is.
-- Looks up the applicable fee structure from the student's program and the
-- promotion's target semester; snapshots its components; assigns a unique
-- voucher number atomically. Does NOT change promotion status — a voucher
-- existing isn't payment (that only happens via clear_promotion_fee()).
create or replace function generate_fee_voucher(p_promotion_id uuid)
returns fee_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
  v_program_id uuid;
  v_semester_number int;
  v_academic_session_id uuid;
  v_structure fee_structures;
  v_voucher fee_vouchers;
  v_year int;
  v_seq int;
  v_component record;
begin
  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;

  if v_promotion.student_profile_id <> auth.uid() then
    if current_user_role() = 'admin' then
      if profile_college_id(v_promotion.student_profile_id) <> current_college_id() then
        raise exception 'insufficient_privilege' using errcode = '42501';
      end if;
    elsif current_user_role() = 'department' then
      if (select department_id from profiles where id = v_promotion.student_profile_id) <> current_department_id() then
        raise exception 'insufficient_privilege' using errcode = '42501';
      end if;
    else
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  if v_promotion.status <> 'fee_pending' then
    raise exception 'invalid_status: promotion must be fee_pending, got %', v_promotion.status;
  end if;

  select program_id into v_program_id from profiles where id = v_promotion.student_profile_id;
  if v_program_id is null then
    raise exception 'student_has_no_program_assigned';
  end if;

  select number, academic_session_id into v_semester_number, v_academic_session_id
  from semesters where id = v_promotion.to_semester_id;

  select * into v_structure from fee_structures
  where program_id = v_program_id
    and semester_number = v_semester_number
    and academic_session_id = v_academic_session_id
    and status = 'active';
  if not found then
    raise exception 'no_fee_structure_configured';
  end if;

  v_year := extract(year from now())::int;
  insert into fee_voucher_counters (academic_year, last_seq)
  values (v_year, 1)
  on conflict (academic_year)
  do update set last_seq = fee_voucher_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into fee_vouchers (
    voucher_number, promotion_id, student_profile_id, fee_structure_id,
    total_amount, status, due_date, generated_by
  ) values (
    'GPGC-FEE-' || v_year || '-' || lpad(v_seq::text, 4, '0'),
    p_promotion_id, v_promotion.student_profile_id, v_structure.id,
    v_structure.total_amount, 'unpaid', (now() + interval '14 days')::date, auth.uid()
  ) returning * into v_voucher;

  for v_component in select name, amount, sort_order from fee_structure_components where fee_structure_id = v_structure.id loop
    insert into fee_voucher_components (fee_voucher_id, name, amount, sort_order)
    values (v_voucher.id, v_component.name, v_component.amount, v_component.sort_order);
  end loop;

  return v_voucher;
end;
$$;

-- RLS ---------------------------------------------------------------------

alter table fee_structures enable row level security;
alter table fee_structure_components enable row level security;
alter table fee_vouchers enable row level security;
alter table fee_voucher_components enable row level security;
alter table fee_voucher_counters enable row level security;

-- Fee structures/components: readable by every authenticated user (a
-- student needs to see the amount before generating), same posture as
-- programs/semesters. Writes only via upsert_fee_structure() above.
create policy "fee_structures_select_authenticated" on fee_structures
  for select to authenticated using (true);
create policy "fee_structure_components_select_authenticated" on fee_structure_components
  for select to authenticated using (true);

create policy "fee_vouchers_select_scoped" on fee_vouchers
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and profile_college_id(student_profile_id) = current_college_id()
    )
    or (
      current_user_role() in ('department', 'faculty')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or profile_visible_to_org_admin(student_profile_id)
  );
-- No INSERT/UPDATE/DELETE policy for any role — generate_fee_voucher(),
-- clear_promotion_fee(), process_fee_bank_import(), and
-- manually_resolve_fee_voucher() (0062/0063) are the only write path,
-- running as table owner (SECURITY DEFINER), same as admit_student().

create policy "fee_voucher_components_select_scoped" on fee_voucher_components
  for select to authenticated
  using (
    exists (
      select 1 from fee_vouchers v where v.id = fee_voucher_id and (
        v.student_profile_id = auth.uid()
        or (
          current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
          and profile_college_id(v.student_profile_id) = current_college_id()
        )
        or (
          current_user_role() in ('department', 'faculty')
          and exists (select 1 from profiles p where p.id = v.student_profile_id and p.department_id = current_department_id())
        )
        or profile_visible_to_org_admin(v.student_profile_id)
      )
    )
  );

create policy "fee_voucher_counters_no_client_access" on fee_voucher_counters
  for all to authenticated
  using (false)
  with check (false);
