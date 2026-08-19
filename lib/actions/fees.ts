"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import {
  upsertFeeStructureSchema,
  generateVoucherSchema,
  generateAdmissionVoucherSchema,
  manuallyClearPromotionFeeSchema,
  manuallyClearAdmissionFeeSchema,
  resolveVoucherSchema,
  finalizePromotionSchema,
} from "@/lib/validations/fees";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";

export async function upsertFeeStructureAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal");

  const componentsRaw = formData.get("components");
  let components: unknown;
  try {
    components = JSON.parse(typeof componentsRaw === "string" ? componentsRaw : "[]");
  } catch {
    return { error: "Invalid fee components" };
  }

  const parsed = upsertFeeStructureSchema.safeParse({
    programId: formData.get("programId"),
    semesterNumber: formData.get("semesterNumber"),
    academicSessionId: formData.get("academicSessionId"),
    components,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_fee_structure", {
    p_program_id: parsed.data.programId,
    p_semester_number: parsed.data.semesterNumber,
    p_academic_session_id: parsed.data.academicSessionId,
    p_components: parsed.data.components,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "upsert_fee_structure", "fee_structures", data?.id, {
    programId: parsed.data.programId,
    semesterNumber: parsed.data.semesterNumber,
    academicSessionId: parsed.data.academicSessionId,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function generateFeeVoucherAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("student", "department", "admin");

  const parsed = generateVoucherSchema.safeParse({
    promotionId: formData.get("promotionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_fee_voucher", {
    p_promotion_id: parsed.data.promotionId,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "generate_fee_voucher", "fee_vouchers", data?.id, {
    promotionId: parsed.data.promotionId,
    voucherNumber: data?.voucher_number,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function generateAdmissionFeeVoucherAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("department", "faculty", "admin");

  const parsed = generateAdmissionVoucherSchema.safeParse({
    admissionId: formData.get("admissionId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_admission_fee_voucher", {
    p_admission_id: parsed.data.admissionId,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "generate_admission_fee_voucher", "fee_vouchers", data?.id, {
    admissionId: parsed.data.admissionId,
    voucherNumber: data?.voucher_number,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function manuallyClearAdmissionFeeAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = manuallyClearAdmissionFeeSchema.safeParse({
    admissionId: formData.get("admissionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("manually_clear_admission_fee", {
    p_admission_id: parsed.data.admissionId,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "manually_clear_admission_fee", "admissions", parsed.data.admissionId, {
    reason: parsed.data.reason,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

// Wraps the repurposed verify_promotion_fee RPC — now purely a
// registration_complete -> promoted finalization step (fee clearance
// already happened upstream via generate_fee_voucher + the bank-match/
// manual-override flow below). Replaces the old verifyPromotionFeeAction.
export async function finalizePromotionAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = finalizePromotionSchema.safeParse({
    promotionId: formData.get("promotionId"),
    receiptNumber: formData.get("receiptNumber"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_promotion_fee", {
    p_promotion_id: parsed.data.promotionId,
    p_receipt_number: parsed.data.receiptNumber || null,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "finalize_promotion", "promotions", parsed.data.promotionId);
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function manuallyClearPromotionFeeAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = manuallyClearPromotionFeeSchema.safeParse({
    promotionId: formData.get("promotionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("manually_clear_promotion_fee", {
    p_promotion_id: parsed.data.promotionId,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "manually_clear_promotion_fee", "promotions", parsed.data.promotionId, {
    reason: parsed.data.reason,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function manuallyResolveFeeVoucherAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = resolveVoucherSchema.safeParse({
    voucherId: formData.get("voucherId"),
    action: formData.get("action"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("manually_resolve_fee_voucher", {
    p_voucher_id: parsed.data.voucherId,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, `manually_${parsed.data.action}_fee_voucher`, "fee_vouchers", parsed.data.voucherId, {
    reason: parsed.data.reason,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}
