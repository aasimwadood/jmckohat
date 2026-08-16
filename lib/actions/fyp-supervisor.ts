"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";
import type { FypEvaluationCriterionEnum, FypGroupStatusEnum } from "@/types/database.types";

export async function respondToSupervisionAction(groupId: string, approve: boolean): Promise<ActionResult> {
  await requireRole("faculty");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_fyp_supervision", { p_group_id: groupId, p_approve: approve });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/fyp");
  return {};
}

export async function reviewFypProposalAction(proposalId: string, approve: boolean, remarks?: string): Promise<ActionResult> {
  await requireRole("faculty");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_fyp_proposal", {
    p_proposal_id: proposalId,
    p_approve: approve,
    p_remarks: remarks || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/fyp");
  return {};
}

export async function advanceFypStageAction(groupId: string, targetStatus: FypGroupStatusEnum): Promise<ActionResult> {
  await requireRole("faculty");
  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_fyp_stage", { p_group_id: groupId, p_target_status: targetStatus });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/faculty/fyp");
  return {};
}

export const EVALUATION_CRITERIA: { key: FypEvaluationCriterionEnum; label: string; max: number }[] = [
  { key: "innovation", label: "Innovation", max: 15 },
  { key: "technical_implementation", label: "Technical Implementation", max: 25 },
  { key: "problem_solving", label: "Problem Solving", max: 15 },
  { key: "documentation", label: "Documentation", max: 15 },
  { key: "presentation_and_demo", label: "Presentation & Demo", max: 20 },
  { key: "teamwork", label: "Teamwork", max: 10 },
];

export async function submitEvaluationAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("faculty");
  const groupId = formData.get("groupId");
  if (typeof groupId !== "string" || !groupId) return { error: "Missing group" };

  const rows = EVALUATION_CRITERIA.map((c) => ({
    fyp_group_id: groupId,
    criterion: c.key,
    max_score: c.max,
    // C4: clamp to [0, max] server-side — the <input max=...> the form uses
    // is client-side only and trivially bypassed; the DB also has a
    // score <= max_score check constraint as a second line of defense.
    score: Math.min(Math.max(0, Number(formData.get(c.key)) || 0), c.max),
    evaluator_profile_id: profile.id,
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("fyp_evaluations").upsert(rows, {
    onConflict: "fyp_group_id,criterion,evaluator_profile_id",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/faculty/fyp");
  return {};
}
