-- Applied after the one-time backfill of every existing profiles row's
-- username (done via script, not a migration — see docs/MIGRATION_PLAN.md).
alter table profiles alter column username set not null;

-- New accounts (both self-registered students and admin-provisioned staff)
-- need a username set at creation time to ever log in afterward. Staff
-- provisioning (lib/actions/provision-staff.ts, provision-org-admin.ts)
-- always passes one explicitly via raw_user_meta_data; the email-prefix
-- fallback below only matters for the rare case something doesn't.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
