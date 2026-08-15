"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { registerCoursesSchema, verifyFeeSchema } from "@/lib/validations/promotions";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";

/**
 * Creates a promotion row (status pending_registration) for every admitted
 * student in the department who has a current semester but no promotion
 * cycle yet for the next one. There was no equivalent "start a cycle"
 * concept in the legacy app — PromotionManagement just listed students who
 * already had promotion data, with no visible path that created it. This
 * is the missing piece, scoped conservatively: default max_courses (6) and
 * academic_standing ('good_standing') until a real academic-standing
 * source of truth exists.
 */
export async function startPromotionCycleAction(departmentId: string): Promise<ActionResult> {
  await requireRole("department", "admin");
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, current_semester_id")
    .eq("department_id", departmentId)
    .eq("role", "student")
    .not("current_semester_id", "is", null);

  if (!students || students.length === 0) return {};

  const semesterIds = [...new Set(students.map((s) => s.current_semester_id!))];
  const { data: semesters } = await supabase
    .from("semesters")
    .select("id, number, academic_session_id")
    .in("id", semesterIds);
  const semesterById = new Map((semesters ?? []).map((s) => [s.id, s]));

  const nextSemesterCache = new Map<string, string | null>();
  async function findNextSemesterId(currentSemesterId: string): Promise<string | null> {
    if (nextSemesterCache.has(currentSemesterId)) return nextSemesterCache.get(currentSemesterId)!;
    const current = semesterById.get(currentSemesterId);
    if (!current || current.number >= 8) {
      nextSemesterCache.set(currentSemesterId, null);
      return null;
    }
    const { data: next } = await supabase
      .from("semesters")
      .select("id")
      .eq("academic_session_id", current.academic_session_id)
      .eq("number", current.number + 1)
      .maybeSingle();
    nextSemesterCache.set(currentSemesterId, next?.id ?? null);
    return next?.id ?? null;
  }

  const rows: { student_profile_id: string; from_semester_id: string; to_semester_id: string }[] = [];
  for (const student of students) {
    const nextId = await findNextSemesterId(student.current_semester_id!);
    if (nextId) {
      rows.push({ student_profile_id: student.id, from_semester_id: student.current_semester_id!, to_semester_id: nextId });
    }
  }

  if (rows.length === 0) return {};

  const { error } = await supabase.from("promotions").upsert(rows, { onConflict: "student_profile_id,to_semester_id", ignoreDuplicates: true });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/promotions");
  return {};
}

export async function registerPromotionCoursesAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "faculty", "admin");

  const parsed = registerCoursesSchema.safeParse({
    promotionId: formData.get("promotionId"),
    courseIds: formData.getAll("courseIds").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_for_promotion", {
    p_promotion_id: parsed.data.promotionId,
    p_course_ids: parsed.data.courseIds,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/department/promotions");
  return {};
}

export async function verifyPromotionFeeAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = verifyFeeSchema.safeParse({
    promotionId: formData.get("promotionId"),
    receiptNumber: formData.get("receiptNumber"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_promotion_fee", {
    p_promotion_id: parsed.data.promotionId,
    p_receipt_number: parsed.data.receiptNumber,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "verify_promotion_fee", "promotions", parsed.data.promotionId, {
    receiptNumber: parsed.data.receiptNumber,
  });
  revalidatePath("/dashboard", "layout");
  return {};
}
