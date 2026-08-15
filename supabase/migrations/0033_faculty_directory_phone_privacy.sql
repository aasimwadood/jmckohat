-- faculty_directory.phone holds real personal mobile numbers (sourced from
-- an internal HED MIS staff export). The existing "select to anon,
-- authenticated using (true)" policy from 0009_public_content.sql controls
-- row visibility, not column visibility — RLS can't hide one column while
-- showing the rest of the row. The only way to do that in Postgres is a
-- column-level privilege restriction, the same mechanism already used on
-- profiles (0002_profiles_and_orgs.sql) for UPDATE — here it's SELECT, and
-- only `anon` is restricted; `authenticated` (any signed-in user — every
-- role in this app) keeps full column access, matching "public can't see
-- it, internal staff can."
revoke select on faculty_directory from anon;
grant select (
  id, category_id, department_id, name, designation, qualification,
  photo_path, specialization, email, publications_count, display_order
) on faculty_directory to anon;
