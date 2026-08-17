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

  const roomValue = typeof room === "string" && room ? room : null;
  const supabase = await createClient();

  // Same real gap as timetable entries (§ workflow audit "no exam-schedule
  // conflict prevention at creation time") — exam_schedules has no faculty
  // column, so only room double-booking is checkable here; same date,
  // overlapping time.
  if (roomValue) {
    const { data: sameDayExams } = await supabase
      .from("exam_schedules")
      .select("start_time, end_time, room")
      .eq("exam_date", examDate)
      .eq("room", roomValue);
    const overlap = (sameDayExams ?? []).some((e) => startTime < e.end_time && e.start_time < endTime);
    if (overlap) {
      return { error: `Room ${roomValue} already has an overlapping exam scheduled on this date.` };
    }
  }

  const { error } = await supabase.from("exam_schedules").insert({
    course_id: courseId,
    semester_id: semesterId,
    exam_date: examDate,
    start_time: startTime,
    end_time: endTime,
    room: roomValue,
    created_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/department/exams");
  revalidatePath("/dashboard/controller/exams");
  return {};
}
