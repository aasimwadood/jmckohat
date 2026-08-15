-- Multi-college public website, part 2: RLS.
--
-- Public read stays exactly as it was (`for select to anon, authenticated
-- using (true)`) — college filtering is an app-query concern, not an RLS
-- concern, same as recruitment's public listing (0039). Only the write
-- policy changes: every "{table}_write_admin" policy from 0009/0011/0012/
-- 0021/0022 is dropped and recreated with one additive `or` branch letting
-- `college_admin` write their own college's rows, alongside the existing
-- (unchanged) `admin` access — matches the additive-policy-rewrite pattern
-- from 0032_hed_hierarchy_org_visibility_policies.sql.

do $$
declare
  t text;
  tables text[] := array[
    'leadership', 'portal_highlights', 'portal_news', 'portal_stats',
    'portal_features', 'institution_faculties', 'portal_quick_stats',
    'faculty_categories', 'faculty_directory', 'download_categories',
    'downloads', 'program_categories', 'program_details',
    'program_requirements', 'program_fees', 'additional_fee_categories',
    'additional_fee_items', 'apply_steps', 'important_dates', 'footer_info',
    'contact_info', 'office_hours', 'department_contacts', 'campus_locations',
    'site_settings'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy "%s_write_admin" on %I', t, t);
    execute format(
      'create policy "%s_write_admin" on %I for all to authenticated ' ||
      'using (current_user_role() = ''admin'' or (current_user_role() = ''college_admin'' and college_id = current_college_id())) ' ||
      'with check (current_user_role() = ''admin'' or (current_user_role() = ''college_admin'' and college_id = current_college_id()))',
      t, t
    );
  end loop;
end $$;
