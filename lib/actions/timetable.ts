"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function createTimetableEntryAction(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "coordinator", "department");

  const courseId = formData.get("courseId");
  const facultyProfileId = formData.get("facultyProfileId");
  const departmentId = formData.get("departmentId");
  const semesterId = formData.get("semesterId");
  const dayOfWeek = formData.get("dayOfWeek");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");
  const room = formData.get("room");
  const groupName = formData.get("groupName");

  if (typeof courseId !== "string" || !courseId) return { error: "Select a course" };
  if (typeof departmentId !== "string" || !departmentId) return { error: "Missing department" };
  if (typeof semesterId !== "string" || !semesterId) return { error: "Select a semester" };
  if (typeof dayOfWeek !== "string" || dayOfWeek === "") return { error: "Select a day" };
  if (typeof startTime !== "string" || !startTime) return { error: "Select a start time" };
  if (typeof endTime !== "string" || !endTime) return { error: "Select an end time" };

  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").insert({
    course_id: courseId,
    faculty_profile_id: typeof facultyProfileId === "string" && facultyProfileId ? facultyProfileId : null,
    department_id: departmentId,
    semester_id: semesterId,
    day_of_week: Number(dayOfWeek),
    start_time: startTime,
    end_time: endTime,
    room: typeof room === "string" && room ? room : null,
    group_name: typeof groupName === "string" && groupName ? groupName : null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/timetable");
  revalidatePath("/dashboard/coordinator/timetable");
  return {};
}

export async function deleteTimetableEntryAction(entryId: string): Promise<ActionResult> {
  await requireRole("admin", "coordinator", "department");
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").delete().eq("id", entryId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/timetable");
  revalidatePath("/dashboard/coordinator/timetable");
  return {};
}
