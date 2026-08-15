"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function saveSiteSettingAction(key: string, value: string, collegeId: string): Promise<ActionResult> {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("site_settings")
    .upsert({ college_id: collegeId, key, value, updated_at: new Date().toISOString() }, { onConflict: "college_id,key" });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/settings");
  return {};
}
