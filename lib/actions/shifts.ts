"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { upsertShiftSchema, deleteShiftSchema } from "@/lib/validations/shifts";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";

export async function upsertShiftAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal");
  if (!profile.collegeId) return { error: "Your account has no college assigned" };

  const parsed = upsertShiftSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const payload = {
    college_id: profile.collegeId,
    name: parsed.data.name,
    code: parsed.data.code.toLowerCase(),
    created_by: profile.id,
  };

  const { error } = parsed.data.id
    ? await supabase.from("shifts").update(payload).eq("id", parsed.data.id)
    : await supabase.from("shifts").insert(payload);
  if (error) return { error: error.message };

  await logAudit(profile.id, parsed.data.id ? "update_shift" : "create_shift", "shifts", parsed.data.id, {
    name: parsed.data.name,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteShiftAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal");

  const parsed = deleteShiftSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").delete().eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(profile.id, "delete_shift", "shifts", parsed.data.id);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function assignAdmissionShiftAction(formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "department", "faculty", "focal_person_intermediate");

  const admissionId = formData.get("admissionId");
  const shiftId = formData.get("shiftId");
  if (typeof admissionId !== "string" || !admissionId) return { error: "Invalid admission" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_admission_shift", {
    p_admission_id: admissionId,
    p_shift_id: typeof shiftId === "string" && shiftId ? shiftId : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}
