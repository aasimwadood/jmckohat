-- Recruitment / Appointment system, part 4: storage bucket.
-- Path convention: recruitment-documents/{application_id}/{filename}
-- Same shape as admission-documents (0010), scoped by the owning
-- application instead of an admission row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recruitment-documents', 'recruitment-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "recruitment_documents_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recruitment-documents'
    and exists (
      select 1 from recruitment_applications ra
      where ra.id = ((storage.foldername(name))[1])::uuid
      and (
        ra.applicant_id = auth.uid()
        or (is_recruitment_staff() and recruitment_application_college_id(ra.id) = current_college_id())
      )
    )
  );

create policy "recruitment_documents_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recruitment-documents'
    and exists (
      select 1 from recruitment_applications ra
      where ra.id = ((storage.foldername(name))[1])::uuid and ra.applicant_id = auth.uid()
    )
  );

create policy "recruitment_documents_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recruitment-documents'
    and exists (
      select 1 from recruitment_applications ra
      where ra.id = ((storage.foldername(name))[1])::uuid and ra.applicant_id = auth.uid() and ra.status = 'draft'
    )
  );
