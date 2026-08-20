-- Consistency gap found reviewing Fee Management end to end: this app's
-- established pattern (README §"HED hierarchy") is that hed_admin/
-- directorate_admin/jmc_admin get real read-only visibility into fee
-- payments/promotions/admissions under their org scope, via
-- profile_visible_to_org_admin()/department_visible_to_org_admin(). The
-- promotion-linked branch of fee_vouchers_select_scoped (0061) already has
-- this; the admission-linked branch added in 0066 does not — an
-- admission-linked voucher has no visible student_profile_id path for an
-- org admin at all until an account is eventually linked. Adding the
-- missing branch so both sources are visible on equal footing.

drop policy "fee_vouchers_select_scoped" on fee_vouchers;
create policy "fee_vouchers_select_scoped" on fee_vouchers
  for select to authenticated
  using (
    student_profile_id = auth.uid()
    or (
      current_user_role() in ('admin', 'principal', 'administration', 'college_admin')
      and (
        (student_profile_id is not null and profile_college_id(student_profile_id) = current_college_id())
        or (admission_id is not null and exists (
          select 1 from admissions ad where ad.id = admission_id and department_college_id(ad.department_id) = current_college_id()
        ))
      )
    )
    or (
      current_user_role() in ('department', 'faculty')
      and (
        (student_profile_id is not null and exists (select 1 from profiles p where p.id = student_profile_id and p.department_id = current_department_id()))
        or (admission_id is not null and exists (select 1 from admissions ad where ad.id = admission_id and ad.department_id = current_department_id()))
      )
    )
    or (student_profile_id is not null and profile_visible_to_org_admin(student_profile_id))
    or (admission_id is not null and exists (
      select 1 from admissions ad where ad.id = admission_id and department_visible_to_org_admin(ad.department_id)
    ))
  );
