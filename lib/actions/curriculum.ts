"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  createCourseSchema,
  updateCourseSchema,
  assignTeacherSchema,
  removeTeacherAssignmentSchema,
} from "@/lib/validations/curriculum";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * The Curriculum page was read-only — RLS already let a department head
 * write both `courses` and `course_faculty` for their own department
 * (courses_write_admin_or_own_department / course_faculty_write_admin_or_department,
 * 0046), but nothing in the app ever called those writes outside a one-off
 * service-role script. Same class of gap as the missing FYP-enable page.
 */
export async function createCourseAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("department", "admin");
  if (!caller.departmentId) return { error: "Your account has no department set" };

  const rawProgramId = formData.get("programId");
  const parsed = createCourseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    credits: formData.get("credits"),
    programId: rawProgramId ? rawProgramId : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    department_id: caller.departmentId,
    program_id: parsed.data.programId,
    code: parsed.data.code,
    title: parsed.data.title,
    credits: parsed.data.credits,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/curriculum");
  return {};
}

export async function updateCourseAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "admin");

  const rawProgramId = formData.get("programId");
  const parsed = updateCourseSchema.safeParse({
    courseId: formData.get("courseId"),
    code: formData.get("code"),
    title: formData.get("title"),
    credits: formData.get("credits"),
    programId: rawProgramId ? rawProgramId : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      code: parsed.data.code,
      title: parsed.data.title,
      credits: parsed.data.credits,
      program_id: parsed.data.programId,
    })
    .eq("id", parsed.data.courseId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/curriculum");
  return {};
}

export async function assignTeacherAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "admin");

  const parsed = assignTeacherSchema.safeParse({
    courseId: formData.get("courseId"),
    facultyProfileId: formData.get("facultyProfileId"),
    semesterId: formData.get("semesterId"),
    offeringType: formData.get("offeringType"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("course_faculty").upsert(
    {
      course_id: parsed.data.courseId,
      faculty_profile_id: parsed.data.facultyProfileId,
      semester_id: parsed.data.semesterId,
      offering_type: parsed.data.offeringType,
    },
    { onConflict: "course_id,faculty_profile_id,semester_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/curriculum");
  return {};
}

export async function removeTeacherAssignmentAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "admin");

  const parsed = removeTeacherAssignmentSchema.safeParse({
    courseId: formData.get("courseId"),
    facultyProfileId: formData.get("facultyProfileId"),
    semesterId: formData.get("semesterId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_faculty")
    .delete()
    .eq("course_id", parsed.data.courseId)
    .eq("faculty_profile_id", parsed.data.facultyProfileId)
    .eq("semester_id", parsed.data.semesterId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/curriculum");
  return {};
}
