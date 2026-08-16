"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { setFypConfigSchema } from "@/lib/validations/fyp-config";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Real bug found live: fyp_semester_config had zero rows in production —
 * RLS already let a department head write it (fyp_config_write_department_or_admin,
 * 0007_fyp.sql), but no page anywhere ever called that write. Since
 * create_fyp_group() hard-requires an enabled config row for the student's
 * own (department, semester), FYP could never actually be started by any
 * real student — this is the missing "HOD enables/disables FYP" step.
 */
export async function setFypConfigAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("department", "admin");
  if (!caller.departmentId) return { error: "Your account has no department set" };

  const parsed = setFypConfigSchema.safeParse({
    semesterId: formData.get("semesterId"),
    isEnabled: formData.get("isEnabled") === "true",
    maxMembers: formData.get("maxMembers"),
    supervisorQuota: formData.get("supervisorQuota"),
    proposalDeadline: formData.get("proposalDeadline"),
    midSemesterDeadline: formData.get("midSemesterDeadline"),
    finalDeadline: formData.get("finalDeadline"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("fyp_semester_config").upsert(
    {
      department_id: caller.departmentId,
      semester_id: parsed.data.semesterId,
      is_enabled: parsed.data.isEnabled,
      max_members: parsed.data.maxMembers,
      supervisor_quota: parsed.data.supervisorQuota,
      proposal_deadline: parsed.data.proposalDeadline || null,
      mid_semester_deadline: parsed.data.midSemesterDeadline || null,
      final_deadline: parsed.data.finalDeadline || null,
      created_by: caller.id,
    },
    { onConflict: "department_id,semester_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/fyp");
  revalidatePath("/dashboard/student/fyp");
  return {};
}
