"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { enrollStudentsSchema, updateEnrollmentStatusSchema } from "@/lib/validations/enrollments";
import { logAudit } from "@/lib/actions/audit";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Workflow audit fix (docs/WORKFLOW_AUDIT.md C2): before this, nothing in
 * the app ever wrote to `enrollments` — no action, no form, no admin UI.
 * Every roster-dependent workflow (results, attendance, assignments,
 * materials) resolves its student list through this table, so without a
 * real writer those were all silently empty. This is the minimum viable
 * fix — one department-facing bulk-enroll action — not a full
 * registration system.
 */
export async function enrollStudentsAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("department", "admin");

  const parsed = enrollStudentsSchema.safeParse({
    courseId: formData.get("courseId"),
    semesterId: formData.get("semesterId"),
    studentProfileIds: formData.getAll("studentProfileIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const rows = parsed.data.studentProfileIds.map((studentProfileId) => ({
    student_profile_id: studentProfileId,
    course_id: parsed.data.courseId,
    semester_id: parsed.data.semesterId,
  }));

  const { error } = await supabase
    .from("enrollments")
    .upsert(rows, { onConflict: "student_profile_id,course_id,semester_id", ignoreDuplicates: true });
  if (error) return { error: error.message };

  await logAudit(profile.id, "enroll_students", "enrollments", parsed.data.courseId, {
    semesterId: parsed.data.semesterId,
    count: parsed.data.studentProfileIds.length,
  });
  revalidatePath("/dashboard/department/enrollments");
  return {};
}

export async function updateEnrollmentStatusAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "admin");

  const parsed = updateEnrollmentStatusSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.enrollmentId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/enrollments");
  return {};
}
