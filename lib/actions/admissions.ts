"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  createAdmissionSchema,
  approveFeeSchema,
  cancelAdmissionSchema,
} from "@/lib/validations/admissions";
import type { ActionResult } from "@/lib/actions/auth";

function randomTemporaryId() {
  return `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function toggleAdmissionSettingsAction(
  departmentId: string,
  academicSessionId: string,
  isEnabled: boolean,
): Promise<ActionResult> {
  const profile = await requireRole("department", "admin");
  const supabase = await createClient();

  const { error } = await supabase.from("admission_settings").upsert(
    {
      department_id: departmentId,
      academic_session_id: academicSessionId,
      is_enabled: isEnabled,
      enabled_by: profile.id,
      enabled_at: isEnabled ? new Date().toISOString() : null,
    },
    { onConflict: "department_id,academic_session_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function createAdmissionAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("department", "faculty", "admin");

  const parsed = createAdmissionSchema.safeParse({
    departmentId: formData.get("departmentId"),
    programId: formData.get("programId"),
    fullName: formData.get("fullName"),
    cnic: formData.get("cnic"),
    contactNumber: formData.get("contactNumber"),
    email: formData.get("email"),
    meritCategory: formData.get("meritCategory"),
    meritNumber: formData.get("meritNumber"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admissions").insert({
    temporary_id: randomTemporaryId(),
    department_id: parsed.data.departmentId,
    program_id: parsed.data.programId || null,
    full_name: parsed.data.fullName,
    cnic: parsed.data.cnic || null,
    contact_number: parsed.data.contactNumber || null,
    email: parsed.data.email || null,
    merit_category: parsed.data.meritCategory,
    merit_number: parsed.data.meritNumber ?? null,
    created_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function approveAdmissionFeeAction(formData: FormData): Promise<ActionResult> {
  await requireRole("administration", "admin");

  const parsed = approveFeeSchema.safeParse({
    admissionId: formData.get("admissionId"),
    receiptNumber: formData.get("receiptNumber"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_admission_fee", {
    p_admission_id: parsed.data.admissionId,
    p_receipt_number: parsed.data.receiptNumber,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function admitStudentAction(admissionId: string): Promise<ActionResult> {
  await requireRole("department", "faculty", "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admit_student", { p_admission_id: admissionId });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function cancelAdmissionAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "faculty", "admin");

  const parsed = cancelAdmissionSchema.safeParse({
    admissionId: formData.get("admissionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_admission", {
    p_admission_id: parsed.data.admissionId,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}
