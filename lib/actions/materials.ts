"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { materialFormSchema } from "@/lib/validations/materials";
import type { ActionResult } from "@/lib/actions/auth";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function uploadMaterialAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");

  const parsed = materialFormSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    type: formData.get("type"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select a file to upload" };
  if (file.size > MAX_SIZE_BYTES) return { error: "File is too large (max 25MB)" };

  const supabase = await createClient();
  const path = `${parsed.data.courseId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("course-materials")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const { error } = await supabase.from("course_materials").insert({
    course_id: parsed.data.courseId,
    faculty_profile_id: profile.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    type: parsed.data.type,
    file_path: path,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/materials");
  return {};
}

export async function deleteMaterialAction(materialId: string): Promise<ActionResult> {
  await requireRole("faculty", "department", "coordinator", "controller");
  const supabase = await createClient();

  const { data: material } = await supabase.from("course_materials").select("file_path").eq("id", materialId).single();
  if (material) {
    await supabase.storage.from("course-materials").remove([material.file_path]);
  }

  const { error } = await supabase.from("course_materials").delete().eq("id", materialId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/faculty/materials");
  return {};
}
