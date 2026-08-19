"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  createAdmissionSchema,
  approveFeeSchema,
  cancelAdmissionSchema,
  uploadAdmissionDocumentSchema,
} from "@/lib/validations/admissions";
import type { ActionResult } from "@/lib/actions/auth";
import { getSignedUrl } from "@/lib/supabase/storage";
import { logAudit } from "@/lib/actions/audit";

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // matches the "admission-documents" bucket's file_size_limit
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];

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
    fatherName: formData.get("fatherName"),
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
  const { data: admission, error } = await supabase
    .from("admissions")
    .insert({
      temporary_id: randomTemporaryId(),
      department_id: parsed.data.departmentId,
      program_id: parsed.data.programId || null,
      full_name: parsed.data.fullName,
      father_name: parsed.data.fatherName || null,
      cnic: parsed.data.cnic || null,
      contact_number: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
      merit_category: parsed.data.meritCategory,
      merit_number: parsed.data.meritNumber ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Best-effort auto-generation (spec: "Immediately after ... automatically
  // generate the fee voucher"). A program not yet configured with a fee
  // structure is an expected, non-fatal condition here — the admission
  // still gets created, and "Generate Fee" retries manually once the
  // structure exists (see generateAdmissionFeeVoucherAction).
  if (admission && parsed.data.programId) {
    const { error: voucherError } = await supabase.rpc("generate_admission_fee_voucher", { p_admission_id: admission.id });
    if (voucherError && !voucherError.message.includes("no_fee_structure_configured")) {
      console.error("auto fee voucher generation failed:", voucherError.message);
    }
  }

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function approveAdmissionFeeAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

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

  await logAudit(profile.id, "approve_admission_fee", "admissions", parsed.data.admissionId, {
    receiptNumber: parsed.data.receiptNumber,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function admitStudentAction(admissionId: string): Promise<ActionResult> {
  const profile = await requireRole("department", "faculty", "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admit_student", { p_admission_id: admissionId });
  if (error) return { error: error.message };

  await logAudit(profile.id, "admit_student", "admissions", admissionId);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function cancelAdmissionAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("department", "faculty", "admin");

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

  await logAudit(profile.id, "cancel_admission", "admissions", parsed.data.admissionId, { reason: parsed.data.reason });
  revalidatePath("/dashboard", "layout");
  return {};
}

export type AdmissionDocumentRow = { id: string; label: string; uploadedAt: string; url: string | null };

export async function getAdmissionDocumentsAction(admissionId: string): Promise<AdmissionDocumentRow[]> {
  await requireRole("department", "faculty", "administration", "admin", "principal");
  const supabase = await createClient();

  const { data } = await supabase
    .from("admission_documents")
    .select("id, label, file_path, uploaded_at")
    .eq("admission_id", admissionId)
    .order("uploaded_at", { ascending: false });

  if (!data) return [];

  return Promise.all(
    data.map(async (doc) => ({
      id: doc.id,
      label: doc.label,
      uploadedAt: doc.uploaded_at,
      url: await getSignedUrl("admission-documents", doc.file_path),
    })),
  );
}

export async function uploadAdmissionDocumentAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("department", "faculty", "admin");

  const parsed = uploadAdmissionDocumentSchema.safeParse({
    admissionId: formData.get("admissionId"),
    label: formData.get("label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select a file to upload" };
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) return { error: "File is too large (max 10MB)" };
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) return { error: "Accepted formats: PDF, PNG, JPEG" };

  const supabase = await createClient();
  const path = `${parsed.data.admissionId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("admission-documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const { error } = await supabase.from("admission_documents").insert({
    admission_id: parsed.data.admissionId,
    label: parsed.data.label,
    file_path: path,
    uploaded_by: profile.id,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "upload_admission_document", "admissions", parsed.data.admissionId, { label: parsed.data.label });
  revalidatePath("/dashboard", "layout");
  return {};
}
