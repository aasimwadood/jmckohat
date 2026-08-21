-- Fines (attendance, proctorial board, library) reuse fee_payments — a
-- per-student pending/paid ledger with a free-text fee_type — rather than a
-- new table, since its pending rows already print automatically on the
-- next voucher PDF as "Outstanding Fee" (app/api/fees/vouchers/[id]/pdf/
-- route.tsx). Librarian is added as a designation (mirroring Chief Proctor/
-- Staff Proctor, 0056_proctorial_board.sql), not a new login role, matching
-- this app's deliberate precedent that proctorial authority is a title an
-- existing staff member holds, not a separate account.

alter table fee_payments add column notes text;

insert into designation_types (name, scope) values ('Librarian', 'college');

create or replace function is_librarian()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from designation_assignments da
    join designation_types dt on dt.id = da.designation_type_id
    where da.profile_id = auth.uid() and dt.name = 'Librarian' and da.college_id = current_college_id()
  );
$$;

-- Additive INSERT-only policy — leaves fee_payments_write_admin_or_administration
-- (the existing "for all" policy on admin/administration) completely
-- untouched. Each branch is scoped both by caller authority AND the row's
-- own fee_type, so e.g. a Librarian can only ever insert library_fine rows,
-- never attendance_fine or proctorial_fine — enforced at the database
-- layer, not just hidden in the UI.
create policy "fee_payments_insert_fines_scoped" on fee_payments
  for insert to authenticated
  with check (
    (
      fee_type = 'attendance_fine'
      and current_user_role() in ('department', 'focal_person_intermediate')
      and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id())
    )
    or (
      fee_type = 'proctorial_fine'
      and (is_chief_proctor() or is_staff_proctor())
      and profile_college_id(student_profile_id) = current_college_id()
    )
    or (
      fee_type = 'library_fine'
      and is_librarian()
      and profile_college_id(student_profile_id) = current_college_id()
    )
  );
