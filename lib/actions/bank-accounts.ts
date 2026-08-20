"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { upsertBankAccountSchema, deleteBankAccountSchema } from "@/lib/validations/bank-accounts";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";

export async function upsertBankAccountAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "administration");
  if (!profile.collegeId) return { error: "Your account has no college assigned" };

  const parsed = upsertBankAccountSchema.safeParse({
    id: formData.get("id") || undefined,
    bankName: formData.get("bankName"),
    accountTitle: formData.get("accountTitle"),
    accountNumber: formData.get("accountNumber"),
    shiftId: formData.get("shiftId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const payload = {
    college_id: profile.collegeId,
    bank_name: parsed.data.bankName,
    account_title: parsed.data.accountTitle || null,
    account_number: parsed.data.accountNumber,
    shift_id: parsed.data.shiftId || null,
    created_by: profile.id,
  };

  const { error } = parsed.data.id
    ? await supabase.from("college_bank_accounts").update(payload).eq("id", parsed.data.id)
    : await supabase.from("college_bank_accounts").insert(payload);
  if (error) return { error: error.message };

  await logAudit(profile.id, parsed.data.id ? "update_bank_account" : "create_bank_account", "college_bank_accounts", parsed.data.id, {
    bankName: parsed.data.bankName,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteBankAccountAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "administration");

  const parsed = deleteBankAccountSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("college_bank_accounts").delete().eq("id", parsed.data.id);
  if (error) return { error: error.message };

  await logAudit(profile.id, "delete_bank_account", "college_bank_accounts", parsed.data.id);
  revalidatePath("/dashboard", "layout");
  return {};
}
