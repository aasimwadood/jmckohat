"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { bulkAssignStudentShiftSchema, bulkAssignStudentPlacementSchema } from "@/lib/validations/students";
import type { ActionResult } from "@/lib/actions/auth";

export async function bulkAssignStudentShiftAction(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "department", "focal_person_intermediate");

  const parsed = bulkAssignStudentShiftSchema.safeParse({
    studentIds: formData.getAll("studentIds").map(String),
    shiftId: formData.get("shiftId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("bulk_assign_student_shift", {
    p_student_ids: parsed.data.studentIds,
    p_shift_id: parsed.data.shiftId || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/students");
  return {};
}

export async function bulkAssignStudentPlacementAction(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "department", "focal_person_intermediate");

  const parsed = bulkAssignStudentPlacementSchema.safeParse({
    studentIds: formData.getAll("studentIds").map(String),
    groupId: formData.get("groupId"),
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("bulk_assign_student_placement", {
    p_student_ids: parsed.data.studentIds,
    p_group_id: parsed.data.groupId || null,
    p_section_id: parsed.data.sectionId || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/students");
  return {};
}
