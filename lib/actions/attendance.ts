"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function markAttendanceAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");

  const courseId = formData.get("courseId");
  const semesterId = formData.get("semesterId");
  const sessionDate = formData.get("sessionDate");
  const studentIds = formData.getAll("studentId").map(String);

  if (typeof courseId !== "string" || !courseId) return { error: "Missing course" };
  if (typeof semesterId !== "string" || !semesterId) return { error: "Missing semester" };
  if (typeof sessionDate !== "string" || !sessionDate) return { error: "Missing date" };
  if (studentIds.length === 0) return { error: "No students to mark" };

  const supabase = await createClient();
  const rows = studentIds.map((studentId) => ({
    student_profile_id: studentId,
    course_id: courseId,
    semester_id: semesterId,
    session_date: sessionDate,
    status: formData.get(`present-${studentId}`) === "on" ? ("present" as const) : ("absent" as const),
    marked_by: profile.id,
  }));

  const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_profile_id,course_id,session_date" });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/faculty/attendance");
  return {};
}
