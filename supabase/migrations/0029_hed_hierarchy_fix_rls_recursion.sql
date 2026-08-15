-- Fixes "infinite recursion detected in policy for relation jmcs" from
-- 0027: colleges_select_scoped subqueried jmcs, and jmcs_select_scoped
-- subqueried colleges, so evaluating either policy triggered evaluation of
-- the other, forever. directorates_select_scoped had the same problem one
-- level up.
--
-- Fix: cross-table lookups inside a policy must go through a SECURITY
-- DEFINER function (which runs as the function owner and so isn't itself
-- subject to the target table's RLS), never a raw subquery against another
-- RLS-protected table — the same reason current_user_role()/
-- current_department_id() are SECURITY DEFINER in 0002_orgs.sql.

create or replace function jmc_directorate_id(p_jmc_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select directorate_id from jmcs where id = p_jmc_id;
$$;

create or replace function college_jmc_id(p_college_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select jmc_id from colleges where id = p_college_id;
$$;

drop policy "directorates_select_scoped" on directorates;
create policy "directorates_select_scoped" on directorates
  for select to authenticated
  using (
    current_user_role() = 'hed_admin'
    or id = current_directorate_id()
    or id = jmc_directorate_id(current_jmc_id())
    or id = jmc_directorate_id(college_jmc_id(current_college_id()))
  );

drop policy "jmcs_select_scoped" on jmcs;
create policy "jmcs_select_scoped" on jmcs
  for select to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and directorate_id = current_directorate_id())
    or id = current_jmc_id()
    or id = college_jmc_id(current_college_id())
  );

drop policy "colleges_select_scoped" on colleges;
create policy "colleges_select_scoped" on colleges
  for select to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and jmc_directorate_id(jmc_id) = current_directorate_id())
    or (current_user_role() = 'jmc_admin' and jmc_id = current_jmc_id())
    or id = current_college_id()
  );

drop policy "colleges_write_hed_directorate_or_jmc" on colleges;
create policy "colleges_write_hed_directorate_or_jmc" on colleges
  for all to authenticated
  using (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and jmc_directorate_id(jmc_id) = current_directorate_id())
    or (current_user_role() = 'jmc_admin' and jmc_id = current_jmc_id())
  )
  with check (
    current_user_role() = 'hed_admin'
    or (current_user_role() = 'directorate_admin' and jmc_directorate_id(jmc_id) = current_directorate_id())
    or (current_user_role() = 'jmc_admin' and jmc_id = current_jmc_id())
  );
