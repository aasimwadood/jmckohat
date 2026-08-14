"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function createExamScheduleAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("department", "controller", "admin");

  const courseId = formData.get("courseId");
  const semesterId = formData.get("semesterId");
  const examDate = formData.get("examDate");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  const room = formData.get("room");

  if (typeof courseId !== "string" || !courseId) return { error: "Select a course" };
  if (typeof semesterId !== "string" || !semesterId) return { error: "Missing semester" };
  if (typeof examDate !== "string" || !examDate) return { error: "Select a date" };
  if (typeof startTime !== "string" || !startTime) return { error: "Select a start time" };
  if (typeof endTime !== "string" || !endTime) return { error: "Select an end time" };

  const supabase = await createClient();
  const { error } = await supabase.from("exam_schedules").insert({
    course_id: courseId,
    semester_id: semesterId,
    exam_date: examDate,
    start_time: startTime,
    end_time: endTime,
    room: typeof room === "string" && room ? room : null,
    created_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/department/exams");
  revalidatePath("/dashboard/controller/exams");
  return {};
}
