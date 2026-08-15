-- HED hierarchy, part 3: one-time backfill of the existing GPGC Kohat
-- college into the new hierarchy. Confirmed with the project owner rather
-- than invented — see docs/MIGRATION_PLAN.md §9 ("Seed data").
--
-- No existing user's role changes here (per spec §27, migrating users into
-- college_admin/jmc_admin/etc. happens later, once those accounts are
-- actually provisioned) — this migration only establishes the org rows and
-- points every existing department/profile at the one college that already
-- exists in this database.

do $$
declare
  v_directorate_id uuid;
  v_jmc_id uuid;
  v_gpgc_type_id uuid;
  v_college_id uuid;
begin
  insert into directorates (name, code, status)
  values ('Directorate of Higher Education, KP', 'DHE-KP', 'active')
  returning id into v_directorate_id;

  insert into jmcs (directorate_id, name, code, district, status)
  values (v_directorate_id, 'JMC Kohat', 'JMC-KOH', 'Kohat', 'active')
  returning id into v_jmc_id;

  select id into v_gpgc_type_id from college_types where code = 'GPGC';

  insert into colleges (jmc_id, college_type_id, name, code, district, status)
  values (v_jmc_id, v_gpgc_type_id, 'Government Postgraduate College Kohat', 'GPGC-KOH', 'Kohat', 'active')
  returning id into v_college_id;

  -- Every department in this database today belongs to this one college.
  update departments set college_id = v_college_id where college_id is null;

  -- Every existing profile belongs to this one college, regardless of role
  -- or whether it has a department_id (controller/coordinator/principal/
  -- administration are institution-wide-within-the-college roles with no
  -- department_id). The sync trigger added in 0027 only fires on future
  -- inserts/updates, so existing rows need this one-time direct backfill.
  update profiles set college_id = v_college_id where college_id is null;
end $$;

alter table departments alter column college_id set not null;
