"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/actions/audit";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Toggle a user's active status. Deactivation is a soft delete — it blocks
 * login (loginAction checks profiles.is_active) without destroying the
 * account's history (results, admissions, etc. all reference it). The
 * legacy admin screen's delete/edit dialogs never called an API at all;
 * this is the real replacement for "delete user".
 */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const caller = await requireRole("admin");
  const admin = createAdminClient();

  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) return { error: error.message };

  await logAudit(caller.id, isActive ? "reactivate_user" : "deactivate_user", "profiles", userId);
  revalidatePath("/dashboard/admin/users");
  return {};
}
