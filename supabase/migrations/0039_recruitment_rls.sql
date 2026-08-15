-- Recruitment / Appointment system, part 3: RLS.
--
-- Status-transition columns (recruitment_applications.status,
-- recruitment_interview_marks.finalized, etc.) have NO blanket UPDATE
-- policy — they only change through the SECURITY DEFINER functions in
-- 0038, which run with the function owner's privileges regardless of what
-- the `authenticated` role is granted here. Plain metadata (advertisement
-- text, positions, merit criteria, required documents, interview
-- scheduling details) is writable directly by scoped staff, matching how
-- e.g. `departments`/`programs` are plain-RLS-writable elsewhere while only
-- the genuinely consequential fields go through a function.

alter table applicant_profiles enable row level security;
alter table recruitment_advertisements enable row level security;
alter table recruitment_positions enable row level security;
alter table recruitment_merit_criteria enable row level security;
alter table recruitment_required_documents enable row level security;
alter table recruitment_applications enable row level security;
alter table recruitment_application_experience enable row level security;
alter table recruitment_application_documents enable row level security;
alter table recruitment_merit_scores enable row level security;
alter table recruitment_interviews enable row level security;
alter table recruitment_interview_marks enable row level security;
alter table recruitment_counters enable row level security;
alter table recruitment_appointment_orders enable row level security;

-- applicant_profiles ---------------------------------------------------

create policy "applicant_profiles_select_own" on applicant_profiles
  for select to authenticated
  using (id = auth.uid());

create policy "applicant_profiles_select_staff" on applicant_profiles
  for select to authenticated
  using (
    is_recruitment_staff()
    and exists (
      select 1 from recruitment_applications ra
      where ra.applicant_id = applicant_profiles.id
      and recruitment_application_college_id(ra.id) = current_college_id()
    )
  );

create policy "applicant_profiles_select_org_admin" on applicant_profiles
  for select to authenticated
  using (
    exists (
      select 1 from recruitment_applications ra
      where ra.applicant_id = applicant_profiles.id
      and college_visible_to_org_admin(recruitment_application_college_id(ra.id))
    )
  );

create policy "applicant_profiles_insert_own" on applicant_profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "applicant_profiles_update_own" on applicant_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- recruitment_advertisements ---------------------------------------------

create policy "recruitment_advertisements_select_public" on recruitment_advertisements
  for select to anon, authenticated
  using (status <> 'draft');

create policy "recruitment_advertisements_select_staff" on recruitment_advertisements
  for select to authenticated
  using (is_recruitment_staff() and college_id = current_college_id());

create policy "recruitment_advertisements_select_org_admin" on recruitment_advertisements
  for select to authenticated
  using (college_visible_to_org_admin(college_id));

create policy "recruitment_advertisements_write_staff" on recruitment_advertisements
  for all to authenticated
  using (is_recruitment_staff() and college_id = current_college_id())
  with check (is_recruitment_staff() and college_id = current_college_id());

-- recruitment_positions ---------------------------------------------------

create policy "recruitment_positions_select_public" on recruitment_positions
  for select to anon, authenticated
  using (exists (select 1 from recruitment_advertisements a where a.id = advertisement_id and a.status <> 'draft'));

create policy "recruitment_positions_select_staff" on recruitment_positions
  for select to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(id) = current_college_id());

create policy "recruitment_positions_select_org_admin" on recruitment_positions
  for select to authenticated
  using (college_visible_to_org_admin(recruitment_position_college_id(id)));

create policy "recruitment_positions_write_staff" on recruitment_positions
  for all to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(id) = current_college_id())
  with check (
    is_recruitment_staff()
    and exists (select 1 from recruitment_advertisements a where a.id = advertisement_id and a.college_id = current_college_id())
  );

-- recruitment_merit_criteria (staff-only, not exposed to applicants) ------

create policy "recruitment_merit_criteria_select_staff" on recruitment_merit_criteria
  for select to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id());

create policy "recruitment_merit_criteria_write_staff" on recruitment_merit_criteria
  for all to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id())
  with check (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id());

-- recruitment_required_documents ------------------------------------------

create policy "recruitment_required_documents_select_public" on recruitment_required_documents
  for select to anon, authenticated
  using (
    exists (
      select 1 from recruitment_positions p
      join recruitment_advertisements a on a.id = p.advertisement_id
      where p.id = position_id and a.status <> 'draft'
    )
  );

create policy "recruitment_required_documents_write_staff" on recruitment_required_documents
  for all to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id())
  with check (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id());

-- recruitment_applications --------------------------------------------------

create policy "recruitment_applications_select_own" on recruitment_applications
  for select to authenticated
  using (applicant_id = auth.uid());

create policy "recruitment_applications_select_staff" on recruitment_applications
  for select to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(id) = current_college_id());

create policy "recruitment_applications_select_org_admin" on recruitment_applications
  for select to authenticated
  using (college_visible_to_org_admin(recruitment_application_college_id(id)));

create policy "recruitment_applications_insert_own" on recruitment_applications
  for insert to authenticated
  with check (applicant_id = auth.uid() and status = 'draft');

-- Only the applicant, only while still a draft, and only the descriptive
-- fields (see the column-level GRANT below) — every status transition goes
-- through the functions in 0038.
create policy "recruitment_applications_update_own_draft" on recruitment_applications
  for update to authenticated
  using (applicant_id = auth.uid() and status = 'draft')
  with check (applicant_id = auth.uid() and status = 'draft');

revoke update on recruitment_applications from authenticated;
grant update (qualification, degree, institution, subject, year_of_completion, marks_obtained, total_marks, percentage_cgpa)
  on recruitment_applications to authenticated;

-- recruitment_application_experience ---------------------------------------

create policy "recruitment_application_experience_select_own" on recruitment_application_experience
  for select to authenticated
  using (exists (select 1 from recruitment_applications ra where ra.id = application_id and ra.applicant_id = auth.uid()));

create policy "recruitment_application_experience_select_staff" on recruitment_application_experience
  for select to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id());

create policy "recruitment_application_experience_write_own_draft" on recruitment_application_experience
  for all to authenticated
  using (
    exists (select 1 from recruitment_applications ra where ra.id = application_id and ra.applicant_id = auth.uid() and ra.status = 'draft')
  )
  with check (
    exists (select 1 from recruitment_applications ra where ra.id = application_id and ra.applicant_id = auth.uid() and ra.status = 'draft')
  );

-- recruitment_application_documents -----------------------------------------

create policy "recruitment_application_documents_select_own" on recruitment_application_documents
  for select to authenticated
  using (exists (select 1 from recruitment_applications ra where ra.id = application_id and ra.applicant_id = auth.uid()));

create policy "recruitment_application_documents_select_staff" on recruitment_application_documents
  for select to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id());

-- Applicant may upload/replace while their application is still editable
-- (spec item 30: "upload/replace documents before submission where
-- allowed"); verification fields are only ever set by verify_recruitment_document().
create policy "recruitment_application_documents_insert_own" on recruitment_application_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from recruitment_applications ra
      where ra.id = application_id and ra.applicant_id = auth.uid()
      and ra.status in ('draft', 'submitted', 'under_scrutiny', 'documents_under_verification')
    )
  );

create policy "recruitment_application_documents_delete_own_draft" on recruitment_application_documents
  for delete to authenticated
  using (exists (select 1 from recruitment_applications ra where ra.id = application_id and ra.applicant_id = auth.uid() and ra.status = 'draft'));

-- recruitment_merit_scores (staff-only; not shown to applicants) -----------

create policy "recruitment_merit_scores_select_staff" on recruitment_merit_scores
  for select to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id());

create policy "recruitment_merit_scores_write_staff" on recruitment_merit_scores
  for all to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id())
  with check (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id());

-- recruitment_interviews ---------------------------------------------------
-- No INSERT policy — creation only happens via schedule_recruitment_interview()
-- (0038), which also cascades application status. Direct UPDATE is fine for
-- non-status edits (venue/time/panel changes).

create policy "recruitment_interviews_select_staff" on recruitment_interviews
  for select to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id());

create policy "recruitment_interviews_select_own_candidate" on recruitment_interviews
  for select to authenticated
  using (
    exists (
      select 1 from recruitment_applications ra
      where ra.position_id = recruitment_interviews.position_id
      and ra.applicant_id = auth.uid()
      and ra.status in ('interview_scheduled', 'interview_completed', 'selected', 'waiting_list', 'not_selected', 'appointment_issued')
    )
  );

create policy "recruitment_interviews_update_staff" on recruitment_interviews
  for update to authenticated
  using (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id())
  with check (is_recruitment_staff() and recruitment_position_college_id(position_id) = current_college_id());

-- recruitment_interview_marks (staff-only; no direct write — RPCs own it) -

create policy "recruitment_interview_marks_select_staff" on recruitment_interview_marks
  for select to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id());

-- recruitment_counters — never touched from client code, matches
-- registration_counters_no_client_access (0005).
create policy "recruitment_counters_no_client_access" on recruitment_counters
  for all to authenticated
  using (false)
  with check (false);

-- recruitment_appointment_orders --------------------------------------------

create policy "recruitment_appointment_orders_select_own" on recruitment_appointment_orders
  for select to authenticated
  using (exists (select 1 from recruitment_applications ra where ra.id = application_id and ra.applicant_id = auth.uid()));

create policy "recruitment_appointment_orders_select_staff" on recruitment_appointment_orders
  for select to authenticated
  using (is_recruitment_staff() and recruitment_application_college_id(application_id) = current_college_id());
