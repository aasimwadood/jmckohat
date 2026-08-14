"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateTranscriptStatusAction(
  requestId: string,
  status: "processing" | "ready" | "rejected",
): Promise<ActionResult> {
  const profile = await requireRole("controller", "admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("transcript_requests")
    .update({ status, processed_by: profile.id, processed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/controller/transcripts");
  return {};
}

export async function resolveResultQueryAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("controller", "admin");

  const queryId = formData.get("queryId");
  const status = formData.get("status");
  const resolutionNote = formData.get("resolutionNote");
  if (typeof queryId !== "string" || !queryId) return { error: "Missing query" };
  if (status !== "resolved" && status !== "rejected") return { error: "Invalid status" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("result_queries")
    .update({
      status,
      resolution_note: typeof resolutionNote === "string" ? resolutionNote : null,
      resolved_by: profile.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", queryId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/controller/queries");
  return {};
}
