"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { upsertGroupSchema, deleteGroupSchema, upsertSectionSchema, deleteSectionSchema } from "@/lib/validations/groups-sections";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";

// For a focal_person_intermediate caller, department scope is their own
// account, never a client-supplied value — RLS re-checks this independently
// (department_id = current_department_id()), but resolving it server-side
// here too avoids ever trusting the form's departmentId for that role.
function resolveDepartmentId(profile: { role: string; departmentId: string | null }, formDepartmentId: string) {
  return profile.role === "focal_person_intermediate" ? profile.departmentId : formDepartmentId;
}

export async function upsertGroupAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");

  const parsed = upsertGroupSchema.safeParse({
    id: formData.get("id") || undefined,
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const departmentId = resolveDepartmentId(profile, parsed.data.departmentId);
  if (!departmentId) return { error: "Your account has no department assigned" };

  const supabase = await createClient();
  const payload = {
    department_id: departmentId,
    name: parsed.data.name,
    code: parsed.data.code.toLowerCase(),
    created_by: profile.id,
  };

  const { error } = parsed.data.id
    ? await supabase.from("groups").update(payload).eq("id", parsed.data.id)
    : await supabase.from("groups").insert(payload);
  if (error) return { error: error.message };

  await logAudit(profile.id, parsed.data.id ? "update_group" : "create_group", "groups", parsed.data.id, {
    name: parsed.data.name,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteGroupAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");

  const parsed = deleteGroupSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(profile.id, "delete_group", "groups", parsed.data.id);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function upsertSectionAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");

  const parsed = upsertSectionSchema.safeParse({
    id: formData.get("id") || undefined,
    departmentId: formData.get("departmentId"),
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const departmentId = resolveDepartmentId(profile, parsed.data.departmentId);
  if (!departmentId) return { error: "Your account has no department assigned" };

  const supabase = await createClient();
  const payload = {
    department_id: departmentId,
    group_id: parsed.data.groupId,
    name: parsed.data.name,
    code: parsed.data.code.toLowerCase(),
    created_by: profile.id,
  };

  const { error } = parsed.data.id
    ? await supabase.from("sections").update(payload).eq("id", parsed.data.id)
    : await supabase.from("sections").insert(payload);
  if (error) return { error: error.message };

  await logAudit(profile.id, parsed.data.id ? "update_section" : "create_section", "sections", parsed.data.id, {
    name: parsed.data.name,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteSectionAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");

  const parsed = deleteSectionSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("sections").delete().eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(profile.id, "delete_section", "sections", parsed.data.id);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function assignAdmissionPlacementAction(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "department", "faculty", "focal_person_intermediate");

  const admissionId = formData.get("admissionId");
  const groupId = formData.get("groupId");
  const sectionId = formData.get("sectionId");
  if (typeof admissionId !== "string" || !admissionId) return { error: "Invalid admission" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_admission_placement", {
    p_admission_id: admissionId,
    p_group_id: typeof groupId === "string" && groupId ? groupId : null,
    p_section_id: typeof sectionId === "string" && sectionId ? sectionId : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}
