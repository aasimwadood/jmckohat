"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  createDesignationTypeSchema,
  setDesignationAssignmentSchema,
  setHeadOfDepartmentSchema,
} from "@/lib/validations/designations";
import type { ActionResult } from "@/lib/actions/auth";

export async function createDesignationTypeAction(formData: FormData): Promise<ActionResult> {
  await requireRole("principal", "admin");

  const parsed = createDesignationTypeSchema.safeParse({
    name: formData.get("name"),
    scope: formData.get("scope"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("designation_types").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/principal/designations");
  return {};
}

/**
 * One holder at a time per (designation, college) or (designation,
 * department) — a plain upsert can't target the two partial unique indexes
 * from the migration through PostgREST, so this looks up any existing row
 * for the same slot and updates it in place; clears the slot when
 * `profileId` is null.
 */
export async function setDesignationAssignmentAction(formData: FormData): Promise<ActionResult> {
  const caller = await requireRole("principal", "department", "admin");

  const rawProfileId = formData.get("profileId");
  const rawDepartmentId = formData.get("departmentId");
  const parsed = setDesignationAssignmentSchema.safeParse({
    designationTypeId: formData.get("designationTypeId"),
    profileId: rawProfileId ? rawProfileId : null,
    departmentId: rawDepartmentId ? rawDepartmentId : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (caller.role === "department" && parsed.data.departmentId !== caller.departmentId) {
    return { error: "You can only manage designations for your own department" };
  }

  const collegeId = caller.collegeId;
  if (!collegeId) return { error: "Your account has no college set" };

  const supabase = await createClient();
  const existingQuery = supabase
    .from("designation_assignments")
    .select("id")
    .eq("designation_type_id", parsed.data.designationTypeId)
    .eq("college_id", collegeId);
  const { data: existing } = parsed.data.departmentId
    ? await existingQuery.eq("department_id", parsed.data.departmentId).maybeSingle()
    : await existingQuery.is("department_id", null).maybeSingle();

  if (!parsed.data.profileId) {
    if (existing) {
      const { error } = await supabase.from("designation_assignments").delete().eq("id", existing.id);
      if (error) return { error: error.message };
    }
    revalidatePath("/dashboard/principal/designations");
    revalidatePath("/dashboard/department/designations");
    return {};
  }

  const row = {
    designation_type_id: parsed.data.designationTypeId,
    college_id: collegeId,
    department_id: parsed.data.departmentId,
    profile_id: parsed.data.profileId,
    assigned_by: caller.id,
    assigned_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("designation_assignments").update(row).eq("id", existing.id)
    : await supabase.from("designation_assignments").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/principal/designations");
  revalidatePath("/dashboard/department/designations");
  return {};
}

export async function setHeadOfDepartmentAction(formData: FormData): Promise<ActionResult> {
  await requireRole("principal", "admin");

  const rawProfileId = formData.get("profileId");
  const parsed = setHeadOfDepartmentSchema.safeParse({
    departmentId: formData.get("departmentId"),
    profileId: rawProfileId ? rawProfileId : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ hod_profile_id: parsed.data.profileId })
    .eq("id", parsed.data.departmentId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/principal/designations");
  return {};
}
