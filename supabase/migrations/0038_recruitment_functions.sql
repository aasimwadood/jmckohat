-- Recruitment / Appointment system, part 2: handle_new_user() change +
-- state-transition functions.
--
-- Follows the exact pattern already established by admit_student()/
-- approve_admission_fee()/cancel_admission() (0005_admissions.sql): every
-- function is SECURITY DEFINER, takes a `select ... for update` row lock,
-- checks the caller's authorization internally, validates the current
-- status before transitioning, and is the *only* way its table's status
-- column changes (0039 puts no blanket UPDATE policy on any table whose
-- status a function here owns).

-- Applicant identity: skip the default-student-profile insert -----------
-- Applicants sign up through the same auth.users/Supabase Auth mechanism
-- as everyone else, but must never get a `profiles` row — they're not
-- students or staff. lib/actions/recruitment-applicant.ts sets
-- account_type: 'applicant' in raw_user_meta_data when creating the
-- auth.users row, specifically so this guard fires.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ->> 'account_type' = 'applicant' then
    return new;
  end if;

  if not exists (select 1 from profiles where id = new.id) then
    insert into profiles (id, role, full_name, email, department_id, username)
    values (
      new.id,
      'student',
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      new.email,
      nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid,
      coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1))
    );
  end if;
  return new;
end;
$$;

-- Scope helpers -----------------------------------------------------------
-- Resolve a position/application back to its owning college, for both the
-- functions below and the RLS policies in 0039.

create or replace function recruitment_position_college_id(p_position_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select a.college_id
  from recruitment_positions p
  join recruitment_advertisements a on a.id = p.advertisement_id
  where p.id = p_position_id;
$$;

create or replace function recruitment_application_college_id(p_application_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select recruitment_position_college_id(r.position_id)
  from recruitment_applications r
  where r.id = p_application_id;
$$;

-- coordinator is the primary owner per spec; admin/principal/college_admin
-- get full management access too (see plan's stated assumption on
-- appointment-order issuance being restricted further, to those three
-- only, excluding coordinator).
create or replace function is_recruitment_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select current_user_role() in ('coordinator', 'admin', 'principal', 'college_admin');
$$;

-- Applicant-facing transitions ---------------------------------------------

create or replace function submit_recruitment_application(p_application_id uuid)
returns recruitment_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app recruitment_applications;
  v_ad_status recruitment_ad_status;
  v_college_id uuid;
  v_college_code text;
  v_year int;
  v_seq int;
  v_missing_mandatory boolean;
begin
  select * into v_app from recruitment_applications where id = p_application_id for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if v_app.applicant_id <> auth.uid() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_app.status <> 'draft' then
    raise exception 'invalid_status: application must be draft to submit, got %', v_app.status;
  end if;

  select a.status, a.college_id into v_ad_status, v_college_id
  from recruitment_positions p
  join recruitment_advertisements a on a.id = p.advertisement_id
  where p.id = v_app.position_id;

  if v_ad_status <> 'applications_open' then
    raise exception 'applications_closed';
  end if;

  select exists (
    select 1 from recruitment_required_documents rd
    where rd.position_id = v_app.position_id and rd.is_mandatory
    and not exists (
      select 1 from recruitment_application_documents ad
      where ad.application_id = p_application_id and ad.document_type = rd.document_type
    )
  ) into v_missing_mandatory;

  if v_missing_mandatory then
    raise exception 'missing_mandatory_documents';
  end if;

  select code into v_college_code from colleges where id = v_college_id;
  v_year := extract(year from now())::int;

  insert into recruitment_counters (college_id, academic_year, counter_type, last_seq)
  values (v_college_id, v_year, 'application', 1)
  on conflict (college_id, academic_year, counter_type)
  do update set last_seq = recruitment_counters.last_seq + 1
  returning last_seq into v_seq;

  update recruitment_applications
  set status = 'submitted',
      application_number = upper(v_college_code) || '-REC-' || v_year || '-' || lpad(v_seq::text, 6, '0'),
      submitted_at = now()
  where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

create or replace function withdraw_recruitment_application(p_application_id uuid)
returns recruitment_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app recruitment_applications;
begin
  select * into v_app from recruitment_applications where id = p_application_id for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if v_app.applicant_id <> auth.uid() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_app.status in ('selected', 'waiting_list', 'not_selected', 'appointment_issued', 'rejected', 'withdrawn') then
    raise exception 'invalid_status: application can no longer be withdrawn, got %', v_app.status;
  end if;

  update recruitment_applications
  set status = 'withdrawn', withdrawn_at = now()
  where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

-- Staff-facing transitions --------------------------------------------------

create or replace function scrutinize_recruitment_application(
  p_application_id uuid,
  p_eligibility_status recruitment_eligibility_status,
  p_remarks text
)
returns recruitment_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app recruitment_applications;
  v_college_id uuid;
  v_unverified_mandatory boolean;
begin
  v_college_id := recruitment_application_college_id(p_application_id);
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_app from recruitment_applications where id = p_application_id for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if v_app.status not in ('submitted', 'under_scrutiny', 'documents_under_verification') then
    raise exception 'invalid_status: application must be submitted/under scrutiny, got %', v_app.status;
  end if;

  if p_eligibility_status = 'eligible' then
    select exists (
      select 1 from recruitment_required_documents rd
      join recruitment_application_documents ad
        on ad.application_id = p_application_id and ad.document_type = rd.document_type
      where rd.position_id = v_app.position_id and rd.is_mandatory
      and ad.verification_status not in ('verified', 'not_required')
    ) into v_unverified_mandatory;

    -- Spec: block marking eligible with unverified mandatory documents
    -- unless the reviewer explicitly overrides with a reason (p_remarks).
    if v_unverified_mandatory and (p_remarks is null or trim(p_remarks) = '') then
      raise exception 'unverified_mandatory_documents: provide an override reason in remarks to proceed';
    end if;
  end if;

  update recruitment_applications
  set status = (case p_eligibility_status when 'eligible' then 'eligible' when 'ineligible' then 'ineligible' else 'under_scrutiny' end)::recruitment_application_status,
      eligibility_status = p_eligibility_status,
      scrutiny_remarks = p_remarks,
      scrutinized_by = auth.uid(),
      scrutinized_at = now()
  where id = p_application_id
  returning * into v_app;

  return v_app;
end;
$$;

create or replace function verify_recruitment_document(
  p_document_id uuid,
  p_status recruitment_document_status,
  p_remarks text
)
returns recruitment_application_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc recruitment_application_documents;
  v_college_id uuid;
begin
  select * into v_doc from recruitment_application_documents where id = p_document_id for update;
  if not found then
    raise exception 'document_not_found';
  end if;

  v_college_id := recruitment_application_college_id(v_doc.application_id);
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update recruitment_application_documents
  set verification_status = p_status,
      verification_remarks = p_remarks,
      verified_by = auth.uid(),
      verified_at = now()
  where id = p_document_id
  returning * into v_doc;

  return v_doc;
end;
$$;

create or replace function shortlist_recruitment_candidates(p_position_id uuid, p_application_ids uuid[])
returns setof recruitment_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_college_id uuid;
begin
  v_college_id := recruitment_position_college_id(p_position_id);
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
    update recruitment_applications
    set status = 'shortlisted'
    where id = any (p_application_ids) and position_id = p_position_id and status = 'eligible'
    returning *;
end;
$$;

create or replace function schedule_recruitment_interview(
  p_position_id uuid,
  p_interview_date date,
  p_interview_time text,
  p_venue text,
  p_panel_info text,
  p_instructions text
)
returns recruitment_interviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_college_id uuid;
  v_interview recruitment_interviews;
begin
  v_college_id := recruitment_position_college_id(p_position_id);
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into recruitment_interviews (position_id, interview_date, interview_time, venue, panel_info, instructions, created_by)
  values (p_position_id, p_interview_date, p_interview_time, p_venue, p_panel_info, p_instructions, auth.uid())
  returning * into v_interview;

  update recruitment_applications
  set status = 'interview_scheduled'
  where position_id = p_position_id and status = 'shortlisted';

  return v_interview;
end;
$$;

create or replace function enter_interview_marks(
  p_application_id uuid,
  p_interview_id uuid,
  p_attendance recruitment_attendance,
  p_marks numeric,
  p_remarks text
)
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
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_marks from recruitment_interview_marks
    where application_id = p_application_id and interview_id = p_interview_id for update;

  if found then
    if v_marks.finalized then
      raise exception 'marks_finalized';
    end if;
    update recruitment_interview_marks
    set attendance = p_attendance, marks = p_marks, remarks = p_remarks,
        entered_by = auth.uid(), entered_at = now()
    where id = v_marks.id
    returning * into v_marks;
  else
    insert into recruitment_interview_marks
      (application_id, interview_id, attendance, marks, remarks, entered_by, entered_at)
    values (p_application_id, p_interview_id, p_attendance, p_marks, p_remarks, auth.uid(), now())
    returning * into v_marks;
  end if;

  return v_marks;
end;
$$;

create or replace function finalize_interview_marks(p_application_id uuid, p_interview_id uuid)
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
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_marks from recruitment_interview_marks
    where application_id = p_application_id and interview_id = p_interview_id for update;
  if not found then
    raise exception 'marks_not_entered';
  end if;
  if v_marks.finalized then
    raise exception 'already_finalized';
  end if;

  update recruitment_interview_marks
  set finalized = true, finalized_by = auth.uid(), finalized_at = now()
  where id = v_marks.id
  returning * into v_marks;

  update recruitment_applications set status = 'interview_completed' where id = p_application_id;

  return v_marks;
end;
$$;

-- Correction path for the rare re-open case, deliberately gated tighter
-- (admin/principal only, not coordinator) than the rest of the pipeline.
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
  if not (current_user_role() in ('admin', 'principal') and v_college_id = current_college_id()) then
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

-- Final rank = merit-criteria total (academic/experience, scored pre-
-- interview via recruitment_merit_scores) + interview marks. Top
-- `vacancies` by rank -> selected; next `vacancies` -> waiting_list;
-- everyone else considered -> not_selected. (Waiting-list sizing isn't
-- specified exactly by the source spec — this is a stated, revisitable
-- assumption, not a hard business rule.)
create or replace function finalize_recruitment_selection(p_position_id uuid)
returns setof recruitment_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_college_id uuid;
  v_vacancies int;
begin
  v_college_id := recruitment_position_college_id(p_position_id);
  if not (is_recruitment_staff() and v_college_id = current_college_id()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select vacancies into v_vacancies from recruitment_positions where id = p_position_id;

  with ranked as (
    select
      ra.id,
      row_number() over (
        order by
          coalesce((select mt.total_score from recruitment_application_merit_totals mt where mt.application_id = ra.id), 0)
          + coalesce(
              (select im.marks from recruitment_interview_marks im
               where im.application_id = ra.id and im.finalized
               order by im.finalized_at desc limit 1),
              0
            ) desc,
          ra.submitted_at asc
      ) as rnk
    from recruitment_applications ra
    where ra.position_id = p_position_id and ra.status = 'interview_completed'
  )
  update recruitment_applications ra
  set final_rank = ranked.rnk,
      status = (case
        when ranked.rnk <= v_vacancies then 'selected'
        when ranked.rnk <= v_vacancies * 2 then 'waiting_list'
        else 'not_selected'
      end)::recruitment_application_status
  from ranked
  where ra.id = ranked.id;

  return query select * from recruitment_applications where position_id = p_position_id and final_rank is not null;
end;
$$;

-- Appointment order issuance is deliberately restricted to
-- principal/college_admin/admin, not coordinator — see plan assumption.
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
  if not (current_user_role() in ('principal', 'college_admin', 'admin') and v_college_id = current_college_id()) then
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
