create table fyp_semester_config (
  department_id uuid not null references departments (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  proposal_deadline date,
  mid_semester_deadline date,
  final_deadline date,
  supervisor_quota int not null default 3,
  max_members int not null default 3,     -- additional members beyond the forming student
  is_enabled boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  primary key (department_id, semester_id)
);

create table fyp_groups (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments (id) on delete cascade,
  semester_id uuid not null references semesters (id) on delete cascade,
  title text,
  supervisor_profile_id uuid references profiles (id),
  status fyp_group_status not null default 'supervisor_pending',
  is_nominated boolean not null default false,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fyp_groups_department_idx on fyp_groups (department_id);
create index fyp_groups_supervisor_idx on fyp_groups (supervisor_profile_id);
create index fyp_groups_semester_idx on fyp_groups (semester_id);

create trigger fyp_groups_set_updated_at
  before update on fyp_groups
  for each row execute function set_updated_at();

create table fyp_members (
  fyp_group_id uuid not null references fyp_groups (id) on delete cascade,
  student_profile_id uuid not null references profiles (id) on delete cascade,
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (fyp_group_id, student_profile_id)
);

create index fyp_members_student_idx on fyp_members (student_profile_id);

create table fyp_proposals (
  id uuid primary key default gen_random_uuid(),
  fyp_group_id uuid not null references fyp_groups (id) on delete cascade,
  file_path text not null,      -- Storage object path in the "fyp-deliverables" bucket
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now()
);

create index fyp_proposals_group_idx on fyp_proposals (fyp_group_id);

create table fyp_deliverables (
  id uuid primary key default gen_random_uuid(),
  fyp_group_id uuid not null references fyp_groups (id) on delete cascade,
  type fyp_deliverable_type not null,
  file_path text not null,
  submitted_by uuid references profiles (id),
  submitted_at timestamptz not null default now()
);

create index fyp_deliverables_group_idx on fyp_deliverables (fyp_group_id);

-- Fixed 6-criterion, 100-point rubric from the legacy evaluation dialog.
create table fyp_evaluations (
  id uuid primary key default gen_random_uuid(),
  fyp_group_id uuid not null references fyp_groups (id) on delete cascade,
  criterion text not null check (criterion in (
    'innovation', 'technical_implementation', 'problem_solving',
    'documentation', 'presentation_and_demo', 'teamwork'
  )),
  max_score numeric not null,
  score numeric not null check (score >= 0),
  evaluator_profile_id uuid not null references profiles (id),
  evaluated_at timestamptz not null default now(),
  unique (fyp_group_id, criterion, evaluator_profile_id)
);

create index fyp_evaluations_group_idx on fyp_evaluations (fyp_group_id);

-- Business logic, moved server-side ---------------------------------------

create or replace function create_fyp_group(
  p_department_id uuid,
  p_semester_id uuid,
  p_member_ids uuid[],       -- additional members, NOT including the caller
  p_supervisor_profile_id uuid,
  p_title text default null
)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config fyp_semester_config;
  v_group fyp_groups;
  v_member_id uuid;
  v_assigned int;
begin
  if current_role() <> 'student' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_config from fyp_semester_config
    where department_id = p_department_id and semester_id = p_semester_id;
  if not found or not v_config.is_enabled then
    raise exception 'fyp_not_enabled_for_semester';
  end if;

  if exists (
    select 1 from fyp_members m
    join fyp_groups g on g.id = m.fyp_group_id
    where m.student_profile_id = auth.uid()
      and g.semester_id = p_semester_id
      and g.status not in ('archived')
  ) then
    raise exception 'already_in_a_group_this_semester';
  end if;

  if array_length(p_member_ids, 1) is not null and array_length(p_member_ids, 1) > v_config.max_members then
    raise exception 'group_size_exceeded: max % additional members', v_config.max_members;
  end if;

  select count(*) into v_assigned from fyp_groups
    where supervisor_profile_id = p_supervisor_profile_id
      and semester_id = p_semester_id
      and status <> 'archived';
  if v_assigned >= v_config.supervisor_quota then
    raise exception 'supervisor_quota_exceeded';
  end if;

  insert into fyp_groups (department_id, semester_id, title, supervisor_profile_id, created_by)
  values (p_department_id, p_semester_id, p_title, p_supervisor_profile_id, auth.uid())
  returning * into v_group;

  insert into fyp_members (fyp_group_id, student_profile_id, is_leader)
  values (v_group.id, auth.uid(), true);

  if p_member_ids is not null then
    foreach v_member_id in array p_member_ids loop
      insert into fyp_members (fyp_group_id, student_profile_id, is_leader)
      values (v_group.id, v_member_id, false)
      on conflict do nothing;
    end loop;
  end if;

  return v_group;
end;
$$;

create or replace function respond_to_fyp_supervision(p_group_id uuid, p_approve boolean)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group fyp_groups;
begin
  select * into v_group from fyp_groups where id = p_group_id for update;
  if not found then
    raise exception 'group_not_found';
  end if;
  if v_group.supervisor_profile_id <> auth.uid() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_group.status <> 'supervisor_pending' then
    raise exception 'invalid_status: group must be supervisor_pending, got %', v_group.status;
  end if;

  update fyp_groups
  set status = case when p_approve then 'proposal_pending' else 'supervisor_pending' end,
      supervisor_profile_id = case when p_approve then supervisor_profile_id else null end
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

create or replace function nominate_fyp_group(p_group_id uuid)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group fyp_groups;
begin
  if current_role() <> 'department' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  select * into v_group from fyp_groups where id = p_group_id and department_id = current_department_id() for update;
  if not found then
    raise exception 'group_not_found';
  end if;

  update fyp_groups set is_nominated = true where id = p_group_id returning * into v_group;
  return v_group;
end;
$$;

create or replace function archive_fyp_group(p_group_id uuid)
returns fyp_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group fyp_groups;
begin
  if current_role() <> 'department' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  select * into v_group from fyp_groups where id = p_group_id and department_id = current_department_id() for update;
  if not found then
    raise exception 'group_not_found';
  end if;

  update fyp_groups set status = 'archived' where id = p_group_id returning * into v_group;
  return v_group;
end;
$$;

-- RLS ---------------------------------------------------------------------

alter table fyp_semester_config enable row level security;
alter table fyp_groups enable row level security;
alter table fyp_members enable row level security;
alter table fyp_proposals enable row level security;
alter table fyp_deliverables enable row level security;
alter table fyp_evaluations enable row level security;

create policy "fyp_config_select_authenticated" on fyp_semester_config
  for select to authenticated using (true);
create policy "fyp_config_write_department_or_admin" on fyp_semester_config
  for all to authenticated
  using (current_role() = 'admin' or (current_role() = 'department' and department_id = current_department_id()))
  with check (current_role() = 'admin' or (current_role() = 'department' and department_id = current_department_id()));

create policy "fyp_groups_select_scoped" on fyp_groups
  for select to authenticated
  using (
    supervisor_profile_id = auth.uid()
    or exists (select 1 from fyp_members m where m.fyp_group_id = fyp_groups.id and m.student_profile_id = auth.uid())
    or current_role() in ('admin', 'principal')
    or (current_role() in ('department', 'coordinator') and department_id = current_department_id())
  );
-- Inserts happen only via create_fyp_group(); status/supervisor transitions
-- only via the functions above. Admin retains a raw escape hatch for support.
create policy "fyp_groups_update_admin_only" on fyp_groups
  for update to authenticated
  using (current_role() = 'admin')
  with check (current_role() = 'admin');

create policy "fyp_members_select_scoped" on fyp_members
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or exists (
      select 1 from fyp_groups g where g.id = fyp_group_id and (
        g.supervisor_profile_id = auth.uid()
        or current_role() in ('admin', 'principal')
        or (current_role() = 'department' and g.department_id = current_department_id())
      )
    )
  );

create policy "fyp_proposals_select_scoped" on fyp_proposals
  for select to authenticated
  using (
    exists (
      select 1 from fyp_groups g where g.id = fyp_group_id and (
        g.supervisor_profile_id = auth.uid()
        or exists (select 1 from fyp_members m where m.fyp_group_id = g.id and m.student_profile_id = auth.uid())
        or current_role() in ('admin', 'principal')
        or (current_role() = 'department' and g.department_id = current_department_id())
      )
    )
  );
create policy "fyp_proposals_insert_member" on fyp_proposals
  for insert to authenticated
  with check (
    exists (select 1 from fyp_members m where m.fyp_group_id = fyp_group_id and m.student_profile_id = auth.uid())
  );
create policy "fyp_proposals_review_supervisor" on fyp_proposals
  for update to authenticated
  using (exists (select 1 from fyp_groups g where g.id = fyp_group_id and g.supervisor_profile_id = auth.uid()))
  with check (exists (select 1 from fyp_groups g where g.id = fyp_group_id and g.supervisor_profile_id = auth.uid()));

create policy "fyp_deliverables_select_scoped" on fyp_deliverables
  for select to authenticated
  using (
    exists (
      select 1 from fyp_groups g where g.id = fyp_group_id and (
        g.supervisor_profile_id = auth.uid()
        or exists (select 1 from fyp_members m where m.fyp_group_id = g.id and m.student_profile_id = auth.uid())
        or current_role() in ('admin', 'principal')
        or (current_role() = 'department' and g.department_id = current_department_id())
      )
    )
  );
create policy "fyp_deliverables_insert_member" on fyp_deliverables
  for insert to authenticated
  with check (
    exists (select 1 from fyp_members m where m.fyp_group_id = fyp_group_id and m.student_profile_id = auth.uid())
  );

create policy "fyp_evaluations_select_scoped" on fyp_evaluations
  for select to authenticated
  using (
    exists (
      select 1 from fyp_groups g where g.id = fyp_group_id and (
        g.supervisor_profile_id = auth.uid()
        or exists (select 1 from fyp_members m where m.fyp_group_id = g.id and m.student_profile_id = auth.uid())
        or current_role() in ('admin', 'principal')
        or (current_role() = 'department' and g.department_id = current_department_id())
      )
    )
  );
create policy "fyp_evaluations_write_supervisor" on fyp_evaluations
  for insert to authenticated
  with check (
    evaluator_profile_id = auth.uid()
    and exists (select 1 from fyp_groups g where g.id = fyp_group_id and g.supervisor_profile_id = auth.uid())
  );
