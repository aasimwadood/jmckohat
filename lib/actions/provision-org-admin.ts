"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { provisionOrgAdminSchema } from "@/lib/validations/org";
import { logAudit } from "@/lib/actions/audit";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Provisions a directorate_admin/jmc_admin/college_admin account. Unlike
 * lib/actions/org.ts, this uses the service-role client (an invited user's
 * profile row must be written before they've ever signed in, so there's no
 * session for the RLS-respecting client to act as) — which means the
 * caller-role/org-scope check that RLS would normally provide has to be
 * done by hand here, matching the hierarchy exactly:
 *   - hed_admin may assign any directorate_admin/jmc_admin/college_admin.
 *   - directorate_admin may assign jmc_admin/college_admin only within
 *     their own directorate.
 *   - jmc_admin may assign college_admin only within their own JMC
 *     (spec §7: "Manage college administrators").
 */
export async function provisionOrgAdminAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("hed_admin", "directorate_admin", "jmc_admin");

  const parsed = provisionOrgAdminSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    orgId: formData.get("orgId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { fullName, email, role, orgId } = parsed.data;

  const supabase = await createClient();

  if (role === "directorate_admin") {
    if (caller.role !== "hed_admin") {
      return { error: "Only an HED Administrator can assign a Directorate Administrator" };
    }
  } else if (role === "jmc_admin") {
    if (caller.role === "directorate_admin") {
      const { data: jmc } = await supabase.from("jmcs").select("directorate_id").eq("id", orgId).maybeSingle();
      if (!jmc || jmc.directorate_id !== caller.directorateId) {
        return { error: "That JMC is outside your directorate" };
      }
    } else if (caller.role !== "hed_admin") {
      return { error: "Only an HED or Directorate Administrator can assign a JMC Administrator" };
    }
  } else {
    // college_admin
    if (caller.role === "directorate_admin") {
      const { data: college } = await supabase.from("colleges").select("jmc_id").eq("id", orgId).maybeSingle();
      const { data: jmc } = college
        ? await supabase.from("jmcs").select("directorate_id").eq("id", college.jmc_id).maybeSingle()
        : { data: null };
      if (!jmc || jmc.directorate_id !== caller.directorateId) {
        return { error: "That college is outside your directorate" };
      }
    } else if (caller.role === "jmc_admin") {
      const { data: college } = await supabase.from("colleges").select("jmc_id").eq("id", orgId).maybeSingle();
      if (!college || college.jmc_id !== caller.jmcId) {
        return { error: "That college is outside your JMC" };
      }
    }
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  });
  if (inviteError || !invited.user) return { error: inviteError?.message ?? "Could not invite user" };

  const updatePayload: { role: typeof role; directorate_id?: string; jmc_id?: string; college_id?: string } = { role };
  if (role === "directorate_admin") updatePayload.directorate_id = orgId;
  if (role === "jmc_admin") updatePayload.jmc_id = orgId;
  if (role === "college_admin") updatePayload.college_id = orgId;

  const { error: profileError } = await admin.from("profiles").update(updatePayload).eq("id", invited.user.id);
  if (profileError) return { error: profileError.message };

  // Keep the denormalized back-pointer (jmcs.jmc_admin_profile_id /
  // colleges.college_admin_profile_id) in sync — convenience fields for
  // "who's the admin here" without a reverse lookup.
  if (role === "jmc_admin") {
    await admin.from("jmcs").update({ jmc_admin_profile_id: invited.user.id }).eq("id", orgId);
  } else if (role === "college_admin") {
    await admin.from("colleges").update({ college_admin_profile_id: invited.user.id }).eq("id", orgId);
  }

  await logAudit(caller.id, "provision_org_admin", "profiles", invited.user.id, { role, orgId, email });
  revalidatePath("/dashboard", "layout");
  return {};
}
