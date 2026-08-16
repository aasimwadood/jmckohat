"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { enrollStudentsSchema, updateEnrollmentStatusSchema } from "@/lib/validations/enrollments";
import { logAudit } from "@/lib/actions/audit";
import type { ActionResult } from "@/lib/actions/auth";

export type EnrollStudentsResult =
  | { error: string; enrolledCount?: undefined; skippedCount?: undefined }
  | { error?: undefined; enrolledCount: number; skippedCount: number };

/**
 * Workflow audit fix (docs/WORKFLOW_AUDIT.md C2): before this, nothing in
 * the app ever wrote to `enrollments` — no action, no form, no admin UI.
 * Every roster-dependent workflow (results, attendance, assignments,
 * materials) resolves its student list through this table, so without a
 * real writer those were all silently empty. This is the minimum viable
 * fix — one department-facing bulk-enroll action — not a full
 * registration system.
 *
 * No semester is passed in — each student's own `current_semester_id` is
 * used, since that's the one source of truth for what semester they're
 * actually in and it already updates on promotion. A student with no
 * current semester set yet (not configured) is skipped, not errored, since
 * a bulk selection spanning a whole batch shouldn't fail entirely over one
 * incomplete profile.
 */
export async function enrollStudentsAction(formData: FormData): Promise<EnrollStudentsResult> {
  const profile = await requireRole("department", "admin");

  const parsed = enrollStudentsSchema.safeParse({
    courseId: formData.get("courseId"),
    studentProfileIds: formData.getAll("studentProfileIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, current_semester_id")
    .in("id", parsed.data.studentProfileIds);
  if (studentsError) return { error: studentsError.message };

  const withSemester = (students ?? []).filter((s) => s.current_semester_id);
  const skippedCount = parsed.data.studentProfileIds.length - withSemester.length;
  if (withSemester.length === 0) {
    return { error: "None of the selected students have a current semester set yet" };
  }

  const rows = withSemester.map((s) => ({
    student_profile_id: s.id,
    course_id: parsed.data.courseId,
    semester_id: s.current_semester_id as string,
  }));

  const { error } = await supabase
    .from("enrollments")
    .upsert(rows, { onConflict: "student_profile_id,course_id,semester_id", ignoreDuplicates: true });
  if (error) return { error: error.message };

  await logAudit(profile.id, "enroll_students", "enrollments", parsed.data.courseId, {
    count: rows.length,
    skipped: skippedCount,
  });
  revalidatePath("/dashboard/department/enrollments");
  return { enrolledCount: rows.length, skippedCount };
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
