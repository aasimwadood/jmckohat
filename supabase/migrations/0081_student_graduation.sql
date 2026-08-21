-- No "graduated"/"alumni" concept exists anywhere in the schema — profiles
-- has no way to distinguish a student who has completed their final
-- semester from one still actively enrolled, so a semester-8 student stays
-- in every active roster/count/report forever. This app consistently
-- models multi-state lifecycles as enums, not booleans, even for a simple
-- two-state case (org_status: 'active'|'inactive', 0027) — student_status
-- follows that same convention, deliberately kept separate from
-- profiles.is_active (a login-block/soft-delete flag, 0002, orthogonal to
-- academic standing: a graduated student keeps logging in to view their
-- own historical fees/results, same as enrollment_status='completed'
-- elsewhere in this app leaves the record live).

create type student_status as enum ('active', 'graduated');

alter table profiles add column student_status student_status not null default 'active';

-- Bulk "Mark as Graduated" — same shape and same fail-closed guarantee as
-- bulk_assign_student_shift/bulk_assign_student_placement (0077): the
-- caller hand-picks known-good students from a checkbox roster, so any id
-- outside the caller's own scope is treated as a bug/tampering signal, not
-- ordinary data noise, and the whole call is rejected rather than applying
-- partially. Deliberately doesn't require the student to actually be at
-- their program's final semester — a registrar may have a real reason to
-- graduate someone the system doesn't have full data for (e.g. an
-- Intermediate transfer, a backdated correction).
create or replace function graduate_students(p_student_ids uuid[])
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user_role() not in ('admin', 'department', 'focal_person_intermediate') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if current_user_role() in ('department', 'focal_person_intermediate') then
    if exists (select 1 from profiles where id = any(p_student_ids) and department_id <> current_department_id()) then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  else
    if exists (
      select 1 from profiles where id = any(p_student_ids) and department_college_id(department_id) <> current_college_id()
    ) then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  end if;

  return query
    update profiles set student_status = 'graduated' where id = any(p_student_ids)
    returning *;
end;
$$;

-- public_department_student_counts() (0051): the public marketing site's
-- per-department counts shouldn't include alumni as current students.
create or replace function public_department_student_counts(p_college_id uuid)
returns table(department_id uuid, student_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select department_id, count(*)
  from profiles
  where role = 'student' and student_status = 'active' and department_id is not null and college_id = p_college_id
  group by department_id;
$$;
