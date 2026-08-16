// Mirrors the fixed sequence enforced server-side in advance_fyp_stage()
// (supabase/migrations/0048_fyp_security_and_lifecycle.sql) — used only to
// compute which stage a "Advance" button should offer next, not as its own
// authorization boundary.
import type { FypGroupStatusEnum } from "@/types/database.types";

const STAGE_SEQUENCE = ["proposal_approved", "in_progress", "mid_semester_review", "final_submission", "completed"] as const;

export function nextFypStage(currentStatus: string): FypGroupStatusEnum | null {
  const idx = STAGE_SEQUENCE.indexOf(currentStatus as (typeof STAGE_SEQUENCE)[number]);
  if (idx === -1 || idx === STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[idx + 1] ?? null;
}
