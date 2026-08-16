"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createAssignmentSchema, gradeSubmissionSchema } from "@/lib/validations/assignments";
import type { ActionResult } from "@/lib/actions/auth";

export async function createAssignmentAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");

  const parsed = createAssignmentSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    course_id: parsed.data.courseId,
    faculty_profile_id: profile.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    due_date: new Date(parsed.data.dueDate).toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/assignments");
  return {};
}

export async function gradeSubmissionAction(formData: FormData): Promise<ActionResult> {
  await requireRole("faculty", "department", "coordinator", "controller");

  const parsed = gradeSubmissionSchema.safeParse({
    submissionId: formData.get("submissionId"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("assignment_submissions")
    .update({ grade: parsed.data.grade, graded_at: new Date().toISOString(), graded_by: user?.id })
    .eq("id", parsed.data.submissionId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/assignments");
  return {};
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the legacy dialog's stated limit
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
];

export async function submitAssignmentAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("student");

  const assignmentId = formData.get("assignmentId");
  const file = formData.get("file");

  if (typeof assignmentId !== "string" || !assignmentId) {
    return { error: "Missing assignment" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Select a file to upload" };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large (max 10MB)" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Accepted formats: PDF, DOCX, ZIP" };
  }

  const supabase = await createClient();
  const path = `${assignmentId}/${profile.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("assignment-submissions")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: "Upload failed. Please try again." };
  }

  const { error: dbError } = await supabase.from("assignment_submissions").upsert(
    {
      assignment_id: assignmentId,
      student_profile_id: profile.id,
      file_path: path,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,student_profile_id" },
  );
  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath("/dashboard/student/assignments");
  return {};
}
