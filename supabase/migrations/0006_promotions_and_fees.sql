create type fee_status as enum ('pending', 'paid');

-- General student fee ledger (tuition/examination/hostel/transport per
-- semester) — distinct from the one-time admission fee line items on
-- `admissions`. Backs the Student dashboard's Fees tab and Principal's
-- financial reporting.
create table fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  semester_id uuid references semesters (id),
  fee_type text not null,          -- 'tuition' | 'examination' | 'hostel' | 'transport' | 'other'
  amount numeric not null check (amount >= 0),
  status fee_status not null default 'pending',
  receipt_number text,
  verified_by uuid references profiles (id),
  verified_at timestamptz,
  due_date date,
  created_at timestamptz not null default now()
);

create index fee_payments_student_idx on fee_payments (student_profile_id);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references profiles (id) on delete cascade,
  from_semester_id uuid not null references semesters (id),
  to_semester_id uuid not null references semesters (id),
  cgpa numeric,
  academic_standing text not null default 'good_standing',
  -- Max courses derived from academic standing at cycle creation time,
  -- enforced server-side in register_for_promotion() rather than the
  -- client-side check the legacy UI relied on.
  max_courses int not null default 6,
  status promotion_status not null default 'pending_registration',
  fee_receipt_number text,
  fee_verified_by uuid references profiles (id),
  fee_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_profile_id, to_semester_id)
);

create index promotions_student_idx on promotions (student_profile_id);
create index promotions_status_idx on promotions (status);

create trigger promotions_set_updated_at
  before update on promotions
  for each row execute function set_updated_at();

-- Business logic, moved server-side ---------------------------------------

create or replace function register_for_promotion(p_promotion_id uuid, p_course_ids uuid[])
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
  v_course_id uuid;
begin
  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;

  if v_promotion.student_profile_id <> auth.uid() and current_user_role() not in ('admin', 'department', 'faculty') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_promotion.status <> 'pending_registration' then
    raise exception 'invalid_status: promotion must be pending_registration, got %', v_promotion.status;
  end if;

  if array_length(p_course_ids, 1) is null or array_length(p_course_ids, 1) > v_promotion.max_courses then
    raise exception 'course_limit_exceeded: max % courses allowed', v_promotion.max_courses;
  end if;

  foreach v_course_id in array p_course_ids loop
    insert into enrollments (student_profile_id, course_id, semester_id, status)
    values (v_promotion.student_profile_id, v_course_id, v_promotion.to_semester_id, 'active')
    on conflict (student_profile_id, course_id, semester_id) do nothing;
  end loop;

  update promotions set status = 'registration_complete'
  where id = p_promotion_id
  returning * into v_promotion;

  return v_promotion;
end;
$$;

-- Fee verification IS the promotion trigger, matching the legacy workflow
-- (no separate approval step once fee is verified).
create or replace function verify_promotion_fee(p_promotion_id uuid, p_receipt_number text)
returns promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promotion promotions;
begin
  if current_user_role() <> 'administration' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_promotion from promotions where id = p_promotion_id for update;
  if not found then
    raise exception 'promotion_not_found';
  end if;
  if v_promotion.status <> 'registration_complete' then
    raise exception 'invalid_status: promotion must be registration_complete, got %', v_promotion.status;
  end if;

  update promotions
  set status = 'promoted',
      fee_receipt_number = p_receipt_number,
      fee_verified_by = auth.uid(),
      fee_verified_at = now()
  where id = p_promotion_id
  returning * into v_promotion;

  update profiles set current_semester_id = v_promotion.to_semester_id
  where id = v_promotion.student_profile_id;

  return v_promotion;
end;
$$;

-- RLS ---------------------------------------------------------------------

alter table fee_payments enable row level security;
alter table promotions enable row level security;

create policy "fee_payments_select_scoped" on fee_payments
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or current_user_role() in ('admin', 'principal', 'administration')
    or (
      current_user_role() = 'department'
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
  );
create policy "fee_payments_write_admin_or_administration" on fee_payments
  for all to authenticated
  using (current_user_role() in ('admin', 'administration'))
  with check (current_user_role() in ('admin', 'administration'));

create policy "promotions_select_scoped" on promotions
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or current_user_role() in ('admin', 'principal', 'administration')
    or (
      current_user_role() in ('department', 'faculty')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
  );
create policy "promotions_insert_admin_or_department" on promotions
  for insert to authenticated
  with check (
    current_user_role() = 'admin'
    or (
      current_user_role() = 'department'
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
  );
-- No blanket UPDATE: status/fee transitions only via the functions above.
create policy "promotions_update_admin_only" on promotions
  for update to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
