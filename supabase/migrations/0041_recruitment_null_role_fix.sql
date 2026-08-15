-- Critical fix, found via live RLS/RPC verification (see docs/MIGRATION_PLAN.md §11):
-- `is_recruitment_staff()` returned SQL NULL — not false — for any caller with no
-- `profiles` row. Every recruitment RPC guards itself with
-- `if not (is_recruitment_staff() and <scope check>) then raise exception ...`, and
-- in three-valued SQL logic `not (null and x)` is NULL, which plpgsql's `IF` treats
-- as "condition not met" (does not raise). Before this migration, job applicants —
-- the first-ever class of authenticated user in this app with no `profiles` row —
-- could call every staff-only recruitment RPC (scrutinize, verify document,
-- shortlist, schedule interview, enter/finalize marks, finalize selection, issue
-- appointment order) with the privilege check silently skipped, falling through to
-- whichever check came next instead of being rejected outright.
--
-- Fix: `is_recruitment_staff()` now always returns a real boolean via `coalesce`,
-- so `not (false and x)` correctly evaluates to `true` and the raise fires as
-- intended. This alone fixes every function that composes through it.
-- `reopen_interview_marks()` checks `current_user_role() in (...)` directly rather
-- than through `is_recruitment_staff()`, so it gets the same coalesce treatment
-- separately.

create or replace function is_recruitment_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(current_user_role() in ('coordinator', 'admin', 'principal', 'college_admin'), false);
$$;

create or replace function reopen_interview_marks(p_application_id uuid, p_interview_id uuid)
returns recruitment_interview_marks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_college_id uuid;
  v_marks recruitment_interview_marks;
begin
  v_college_id := recruitment_application_college_id(p_application_id);
  if not coalesce(current_user_role() in ('admin', 'principal') and v_college_id = current_college_id(), false) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update recruitment_interview_marks
  set finalized = false, finalized_by = null, finalized_at = null
  where application_id = p_application_id and interview_id = p_interview_id
  returning * into v_marks;

  if not found then
    raise exception 'marks_not_found';
  end if;

  return v_marks;
end;
$$;

-- issue_appointment_order() checks `current_user_role() in ('principal', 'college_admin', 'admin')`
-- directly (not through is_recruitment_staff(), since it's a narrower role set) —
-- same NULL-propagation risk, same coalesce fix.
create or replace function issue_appointment_order(
  p_application_id uuid,
  p_terms text,
  p_reporting_instructions text,
  p_joining_deadline date,
  p_officer_name text,
  p_officer_title text
)
returns recruitment_appointment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app recruitment_applications;
  v_college_id uuid;
  v_college_code text;
  v_year int;
  v_seq int;
  v_order recruitment_appointment_orders;
begin
  select * into v_app from recruitment_applications where id = p_application_id for update;
  if not found then
    raise exception 'application_not_found';
  end if;

  v_college_id := recruitment_application_college_id(p_application_id);
  if not coalesce(current_user_role() in ('principal', 'college_admin', 'admin') and v_college_id = current_college_id(), false) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_app.status <> 'selected' then
    raise exception 'invalid_status: application must be selected to issue an appointment order, got %', v_app.status;
  end if;

  select code into v_college_code from colleges where id = v_college_id;
  v_year := extract(year from now())::int;

  insert into recruitment_counters (college_id, academic_year, counter_type, last_seq)
  values (v_college_id, v_year, 'appointment_order', 1)
  on conflict (college_id, academic_year, counter_type)
  do update set last_seq = recruitment_counters.last_seq + 1
  returning last_seq into v_seq;

  insert into recruitment_appointment_orders (
    application_id, order_number, terms_and_conditions, reporting_instructions,
    joining_deadline, authorized_officer_name, authorized_officer_title, generated_by
  )
  values (
    p_application_id,
    upper(v_college_code) || '/REC/' || v_year || '/' || lpad(v_seq::text, 3, '0'),
    p_terms, p_reporting_instructions, p_joining_deadline, p_officer_name, p_officer_title, auth.uid()
  )
  returning * into v_order;

  update recruitment_applications set status = 'appointment_issued' where id = p_application_id;

  return v_order;
end;
$$;
