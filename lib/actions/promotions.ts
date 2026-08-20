"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { registerCoursesSchema } from "@/lib/validations/promotions";
import type { ActionResult } from "@/lib/actions/auth";
import { maxSemesterNumberFor } from "@/lib/utils/degree-level";

/**
 * Creates a promotion row (status fee_pending) for every admitted student
 * in the department who has a current semester but no promotion cycle yet
 * for the next one. There was no equivalent "start a cycle" concept in the
 * legacy app — PromotionManagement just listed students who already had
 * promotion data, with no visible path that created it. This is the
 * missing piece, scoped conservatively: default max_courses (6) and
 * academic_standing ('good_standing') until a real academic-standing
 * source of truth exists.
 */
export async function startPromotionCycleAction(departmentId: string): Promise<ActionResult> {
  await requireRole("department", "admin", "focal_person_intermediate");
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, current_semester_id, program_id")
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

  // Intermediate programs only ever span 2 years (First/Second Year, reusing
  // semesters 1-2) — the cap below must NOT default to the BS 8-semester
  // ceiling for them, or an Intermediate student would keep "promoting"
  // into semesters that don't correspond to a real Intermediate year.
  const programIds = [...new Set(students.map((s) => s.program_id).filter((id): id is string => !!id))];
  const { data: programs } =
    programIds.length > 0 ? await supabase.from("programs").select("id, degree_level").in("id", programIds) : { data: [] };
  const degreeLevelByProgram = new Map((programs ?? []).map((p) => [p.id, p.degree_level]));

  const nextSemesterCache = new Map<string, string | null>();
  async function findNextSemesterId(currentSemesterId: string, maxSemesterNumber: number): Promise<string | null> {
    const cacheKey = `${currentSemesterId}:${maxSemesterNumber}`;
    if (nextSemesterCache.has(cacheKey)) return nextSemesterCache.get(cacheKey)!;
    const current = semesterById.get(currentSemesterId);
    if (!current || current.number >= maxSemesterNumber) {
      nextSemesterCache.set(cacheKey, null);
      return null;
    }
    const { data: next } = await supabase
      .from("semesters")
      .select("id")
      .eq("academic_session_id", current.academic_session_id)
      .eq("number", current.number + 1)
      .maybeSingle();
    nextSemesterCache.set(cacheKey, next?.id ?? null);
    return next?.id ?? null;
  }

  const rows: { student_profile_id: string; from_semester_id: string; to_semester_id: string; status: "fee_pending" }[] = [];
  for (const student of students) {
    const maxSemesterNumber = maxSemesterNumberFor(student.program_id ? degreeLevelByProgram.get(student.program_id) : null);
    const nextId = await findNextSemesterId(student.current_semester_id!, maxSemesterNumber);
    if (nextId) {
      rows.push({
        student_profile_id: student.id,
        from_semester_id: student.current_semester_id!,
        to_semester_id: nextId,
        // Promotions now start awaiting fee, not awaiting course
        // registration — see supabase/migrations/0062_promotion_fee_gating.sql.
        status: "fee_pending",
      });
    }
  }

  if (rows.length === 0) return {};

  const { error } = await supabase.from("promotions").upsert(rows, { onConflict: "student_profile_id,to_semester_id", ignoreDuplicates: true });
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}

export async function registerPromotionCoursesAction(formData: FormData): Promise<ActionResult> {
  await requireRole("department", "faculty", "admin", "focal_person_intermediate");

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

  revalidatePath("/dashboard", "layout");
  return {};
}

// Fee verification moved to lib/actions/fees.ts (generateFeeVoucherAction +
// the bank-import matching engine + manuallyClearPromotionFeeAction) as
// part of Fee Management Phase 1 — see supabase/migrations/0062. The old
// registration_complete -> promoted finalization step lives on there too,
// as finalizePromotionAction.
