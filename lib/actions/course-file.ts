"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function saveCourseFileReportAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty", "admin");

  const courseId = formData.get("courseId");
  const semesterId = formData.get("semesterId");
  if (typeof courseId !== "string" || !courseId) return { error: "Missing course" };
  if (typeof semesterId !== "string" || !semesterId) return { error: "Missing semester" };

  const content = {
    learningObjectives: String(formData.get("learningObjectives") ?? ""),
    weeklyContent: String(formData.get("weeklyContent") ?? ""),
    assessmentPlan: String(formData.get("assessmentPlan") ?? ""),
    recommendedBooks: String(formData.get("recommendedBooks") ?? ""),
    teachingMethods: String(formData.get("teachingMethods") ?? ""),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("course_file_reports").upsert(
    {
      course_id: courseId,
      semester_id: semesterId,
      faculty_profile_id: profile.id,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "course_id,semester_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/course-file");
  return {};
}
