"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { addFineSchema } from "@/lib/validations/fines";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";

/**
 * Adds a fine (attendance/proctorial/library) to a student's fee_payments
 * ledger — reused rather than a new table, since pending fee_payments rows
 * already print automatically as "Outstanding Fee" on the student's next
 * voucher PDF. No role check here: the caller could be holding any of
 * three different kinds of authority (department/focal_person_intermediate
 * for attendance, the Chief/Staff Proctor designation for proctorial, the
 * Librarian designation for library) that aren't cleanly expressible as a
 * fixed role list — fee_payments_insert_fines_scoped (0080) is the real
 * gate, scoped both by caller authority AND the row's own fine_type.
 */
export async function addStudentFineAction(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in" };

  const parsed = addFineSchema.safeParse({
    studentId: formData.get("studentId"),
    fineType: formData.get("fineType"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: student } = await supabase.from("profiles").select("current_semester_id").eq("id", parsed.data.studentId).single();

  // No .select() here on purpose: a Chief/Staff Proctor or Librarian is
  // authorized to INSERT a fine (fee_payments_insert_fines_scoped, 0080)
  // but fee_payments_select_scoped doesn't grant them read access to the
  // student's fee ledger — chaining .select() would make INSERT ...
  // RETURNING subject to that SELECT policy too and fail even though the
  // insert itself succeeded.
  const { error } = await supabase.from("fee_payments").insert({
    student_profile_id: parsed.data.studentId,
    semester_id: student?.current_semester_id ?? null,
    fee_type: parsed.data.fineType,
    amount: parsed.data.amount,
    notes: parsed.data.notes,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "add_student_fine", "fee_payments", undefined, {
    studentId: parsed.data.studentId,
    fineType: parsed.data.fineType,
    amount: parsed.data.amount,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}
