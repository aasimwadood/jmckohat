-- Buckets -------------------------------------------------------------
-- Path conventions (enforced by the RLS policies below, and followed by
-- every upload call in lib/services/*):
--   avatars/{profile_id}/{filename}
--   public-assets/{anything}                       -- admin-managed CMS media
--   course-materials/{course_id}/{filename}
--   assignment-submissions/{assignment_id}/{student_profile_id}/{filename}
--   fyp-deliverables/{fyp_group_id}/{filename}
--   admission-documents/{admission_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('public-assets', 'public-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('course-materials', 'course-materials', false, 26214400, null),
  ('assignment-submissions', 'assignment-submissions', false, 26214400, null),
  ('fyp-deliverables', 'fyp-deliverables', false, 104857600, null),
  ('admission-documents', 'admission-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- avatars: owner manages their own folder; bucket is public so reads don't
-- need a policy (public buckets serve objects unauthenticated).
create policy "avatars_write_own_folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- public-assets: admin-managed only (reads are public via the bucket flag).
create policy "public_assets_write_admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'public-assets' and current_user_role() = 'admin')
  with check (bucket_id = 'public-assets' and current_user_role() = 'admin');

-- course-materials: same access rule as the course_materials table.
create policy "course_materials_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and (
      teaches_course(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from enrollments e
        where e.course_id = ((storage.foldername(name))[1])::uuid and e.student_profile_id = auth.uid()
      )
      or current_user_role() in ('admin', 'principal')
    )
  );
create policy "course_materials_bucket_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-materials'
    and (current_user_role() = 'admin' or teaches_course(((storage.foldername(name))[1])::uuid))
  );
create policy "course_materials_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-materials'
    and (current_user_role() = 'admin' or teaches_course(((storage.foldername(name))[1])::uuid))
  );

-- assignment-submissions: student owns their own submission folder;
-- faculty of the course can read.
create policy "assignment_submissions_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from assignments a
        where a.id = ((storage.foldername(name))[1])::uuid and teaches_course(a.course_id)
      )
      or current_user_role() = 'admin'
    )
  );
create policy "assignment_submissions_bucket_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assignment-submissions' and (storage.foldername(name))[2] = auth.uid()::text);

-- fyp-deliverables: group members + supervisor + HoD of that department.
create policy "fyp_deliverables_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fyp-deliverables'
    and exists (
      select 1 from fyp_groups g
      where g.id = ((storage.foldername(name))[1])::uuid and (
        g.supervisor_profile_id = auth.uid()
        or exists (select 1 from fyp_members m where m.fyp_group_id = g.id and m.student_profile_id = auth.uid())
        or current_user_role() in ('admin', 'principal')
        or (current_user_role() = 'department' and g.department_id = current_department_id())
      )
    )
  );
create policy "fyp_deliverables_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fyp-deliverables'
    and exists (
      select 1 from fyp_members m
      where m.fyp_group_id = ((storage.foldername(name))[1])::uuid and m.student_profile_id = auth.uid()
    )
  );

-- admission-documents: same scoping as the admissions table.
create policy "admission_documents_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'admission-documents'
    and exists (
      select 1 from admissions ad
      where ad.id = ((storage.foldername(name))[1])::uuid and (
        ad.student_profile_id = auth.uid()
        or current_user_role() in ('admin', 'principal', 'administration')
        or (current_user_role() in ('department', 'faculty') and ad.department_id = current_department_id())
      )
    )
  );
create policy "admission_documents_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'admission-documents'
    and exists (
      select 1 from admissions ad
      where ad.id = ((storage.foldername(name))[1])::uuid and (
        current_user_role() = 'admin'
        or (current_user_role() in ('department', 'faculty') and ad.department_id = current_department_id())
      )
    )
  );
