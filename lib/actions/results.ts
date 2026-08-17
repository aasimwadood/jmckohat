"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { submitResultSchema, setFinalExamMarkSchema } from "@/lib/validations/results";
import type { ActionResult } from "@/lib/actions/auth";

export async function submitResultAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");

  const parsed = submitResultSchema.safeParse({
    studentProfileId: formData.get("studentProfileId"),
    courseId: formData.get("courseId"),
    semesterId: formData.get("semesterId"),
    quiz1: formData.get("quiz1"),
    quiz2: formData.get("quiz2"),
    midterm: formData.get("midterm"),
    assignmentsScore: formData.get("assignmentsScore"),
    presentation: formData.get("presentation"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Real constraint (results_internal_total_max, 0060): quiz1 + quiz2 +
  // assignments_score + presentation <= 25 — "distribution depends on
  // teacher" means no fixed per-field cap, only the pool total. Checked
  // here too for a friendly error ahead of the raw DB constraint message.
  const internalTotal = parsed.data.quiz1 + parsed.data.quiz2 + parsed.data.assignmentsScore + parsed.data.presentation;
  if (internalTotal > 25) {
    return { error: `Internal marks (Quizzes + Assignments + Presentation) total ${internalTotal}, which exceeds the 25-mark internal pool` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("results").upsert(
    {
      student_profile_id: parsed.data.studentProfileId,
      course_id: parsed.data.courseId,
      semester_id: parsed.data.semesterId,
      quiz1: parsed.data.quiz1,
      quiz2: parsed.data.quiz2,
      midterm: parsed.data.midterm,
      assignments_score: parsed.data.assignmentsScore,
      presentation: parsed.data.presentation,
      submitted_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_profile_id,course_id,semester_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/marks");
  return {};
}

/**
 * Final Exam marks are issued by the affiliating university, not entered
 * by college faculty — recording them is the Controller's job (the
 * college's real point of contact with the university's examination
 * system), independent of who teaches the course. Only ever sends
 * `final_exam`; RLS (results_write_faculty_own_course, 0059) lets a
 * controller touch any result row at their own college for exactly this
 * reason, trusting this action not to touch the other columns.
 */
export async function setFinalExamMarkAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("controller", "admin");

  const parsed = setFinalExamMarkSchema.safeParse({
    studentProfileId: formData.get("studentProfileId"),
    courseId: formData.get("courseId"),
    semesterId: formData.get("semesterId"),
    finalExam: formData.get("finalExam"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("results").upsert(
    {
      student_profile_id: parsed.data.studentProfileId,
      course_id: parsed.data.courseId,
      semester_id: parsed.data.semesterId,
      final_exam: parsed.data.finalExam,
      submitted_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_profile_id,course_id,semester_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/dashboard/controller/results");
  return {};
}
