"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validations/profile";
import { ROLE_DASHBOARD_PATH } from "@/lib/permissions/roles";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Every role uses this — it can only ever touch full_name/phone/avatar_path
 * because `profiles` has column-level UPDATE grants restricted to those
 * fields for the `authenticated` role (see 0002_profiles_and_orgs.sql).
 * There is no path from here to changing role/department/is_active.
 */
export async function updateOwnProfileAction(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in" };

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath(ROLE_DASHBOARD_PATH[profile.role]);
  return {};
}
