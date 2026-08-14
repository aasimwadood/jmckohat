"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { submitResultSchema } from "@/lib/validations/results";
import type { ActionResult } from "@/lib/actions/auth";

export async function submitResultAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty");

  const parsed = submitResultSchema.safeParse({
    studentProfileId: formData.get("studentProfileId"),
    courseId: formData.get("courseId"),
    semesterId: formData.get("semesterId"),
    quiz1: formData.get("quiz1"),
    quiz2: formData.get("quiz2"),
    midterm: formData.get("midterm"),
    assignmentsScore: formData.get("assignmentsScore"),
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
      quiz1: parsed.data.quiz1,
      quiz2: parsed.data.quiz2,
      midterm: parsed.data.midterm,
      assignments_score: parsed.data.assignmentsScore,
      submitted_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_profile_id,course_id,semester_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/marks");
  return {};
}
