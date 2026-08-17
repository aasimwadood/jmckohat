"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { findSchedulingConflicts } from "@/lib/services/scheduling-conflicts";
import type { ActionResult } from "@/lib/actions/auth";
import type { Database } from "@/types/database.types";

type TimetableEntry = Database["public"]["Tables"]["timetable_entries"]["Row"];

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

  // Real gap found in the workflow audit: scheduling-conflicts.ts only
  // ever detected conflicts after the fact (Coordinator's read-only
  // Conflicts page) — nothing blocked a double-booking at creation time.
  // Reuses that same detection logic, run against the proposed entry
  // before it's ever inserted. Checked globally (not department-scoped):
  // the same faculty member or room can just as easily double-book across
  // two different departments' timetables.
  const dayOfWeekNum = Number(dayOfWeek);
  const { data: sameDayEntries } = await supabase.from("timetable_entries").select("*").eq("day_of_week", dayOfWeekNum);
  const proposed: TimetableEntry = {
    id: "__proposed__",
    course_id: courseId,
    faculty_profile_id: typeof facultyProfileId === "string" && facultyProfileId ? facultyProfileId : null,
    department_id: departmentId,
    semester_id: semesterId,
    day_of_week: dayOfWeekNum,
    start_time: startTime,
    end_time: endTime,
    room: typeof room === "string" && room ? room : null,
    group_name: typeof groupName === "string" && groupName ? groupName : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const conflicts = findSchedulingConflicts([...(sameDayEntries ?? []), proposed]);
  const ownConflict = conflicts.find((c) => c.entries.some((e) => e.id === "__proposed__"));
  if (ownConflict) {
    return {
      error:
        ownConflict.type === "faculty"
          ? "This faculty member already has an overlapping class at this time."
          : `Room ${ownConflict.key} is already booked at an overlapping time.`,
    };
  }

  const { error } = await supabase.from("timetable_entries").insert({
    course_id: proposed.course_id,
    faculty_profile_id: proposed.faculty_profile_id,
    department_id: proposed.department_id,
    semester_id: proposed.semester_id,
    day_of_week: proposed.day_of_week,
    start_time: proposed.start_time,
    end_time: proposed.end_time,
    room: proposed.room,
    group_name: proposed.group_name,
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
