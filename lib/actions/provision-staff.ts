"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { provisionStaffSchema } from "@/lib/validations/staff";
import { logAudit } from "@/lib/actions/audit";
import { generateUniqueUsername } from "@/lib/utils/username";

export type ProvisionStaffResult = { error: string; username?: undefined } | { error?: undefined; username: string };

/**
 * Creates a staff account (any non-student role). Public self-registration
 * is students-only (see lib/actions/auth.ts registerAction) — every other
 * role is provisioned here, by an admin, using the service-role client.
 * The new user is invited by email and sets their own password, then logs
 * in with the username generated below (login is username-based).
 */
export async function provisionStaffAction(formData: FormData): Promise<ProvisionStaffResult> {
  const caller = await requireRole("admin", "principal");

  const parsed = provisionStaffSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { fullName, email, role, departmentId, phone } = parsed.data;
  const username = await generateUniqueUsername(fullName);
  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, username },
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  });

  if (inviteError || !invited.user) {
    return { error: inviteError?.message ?? "Could not invite user" };
  }

  // The on_auth_user_created trigger already inserted a default 'student'
  // profile for this new auth.users row — overwrite it with the intended
  // role/department here, using the service-role client so the column-level
  // restriction that blocks self-service role changes doesn't apply.
  //
  // college_id: department-tied roles derive it automatically from
  // department_id via the sync_profile_college_id() trigger (fires on
  // "update of department_id", a no-op here if departmentId is empty). For
  // department-optional roles (admin/principal/controller/coordinator/
  // administration), there's no department to derive it from, so it's set
  // directly here to the *provisioning admin's own* college — an admin can
  // only ever provision staff for their own college, not a picker, so
  // there's no way to create a staff account scoped to the wrong one. This
  // is what makes the college-scoped RLS from 0045-0047 actually correct
  // going forward, not just for the pre-existing backfilled accounts.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role,
      department_id: departmentId || null,
      phone: phone || null,
      ...(departmentId ? {} : { college_id: caller.collegeId }),
    })
    .eq("id", invited.user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  await logAudit(caller.id, "provision_staff", "profiles", invited.user.id, { role, email, username });

  return { username };
}
