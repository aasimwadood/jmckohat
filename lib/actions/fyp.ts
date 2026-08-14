"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createFypGroupSchema } from "@/lib/validations/fyp";
import type { ActionResult } from "@/lib/actions/auth";
import type { FypDeliverableTypeEnum } from "@/types/database.types";

export async function createFypGroupAction(formData: FormData): Promise<ActionResult> {
  await requireRole("student");

  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);
  const parsed = createFypGroupSchema.safeParse({
    departmentId: formData.get("departmentId"),
    semesterId: formData.get("semesterId"),
    supervisorProfileId: formData.get("supervisorProfileId"),
    title: formData.get("title"),
    memberIds,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_fyp_group", {
    p_department_id: parsed.data.departmentId,
    p_semester_id: parsed.data.semesterId,
    p_member_ids: parsed.data.memberIds,
    p_supervisor_profile_id: parsed.data.supervisorProfileId,
    p_title: parsed.data.title || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/student/fyp");
  return {};
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export async function uploadFypProposalAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("student");
  const groupId = formData.get("groupId");
  const file = formData.get("file");

  if (typeof groupId !== "string" || !groupId) return { error: "Missing group" };
  if (!(file instanceof File) || file.size === 0) return { error: "Select a file to upload" };
  if (file.size > MAX_SIZE_BYTES) return { error: "File is too large" };

  const supabase = await createClient();
  const path = `${groupId}/proposal-${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("fyp-deliverables").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const { error } = await supabase.from("fyp_proposals").insert({ fyp_group_id: groupId, file_path: path });
  if (error) return { error: error.message };

  void profile;
  revalidatePath("/dashboard/student/fyp");
  return {};
}

export async function uploadFypDeliverableAction(formData: FormData): Promise<ActionResult> {
  await requireRole("student");
  const groupId = formData.get("groupId");
  const type = formData.get("type") as FypDeliverableTypeEnum | null;
  const file = formData.get("file");

  if (typeof groupId !== "string" || !groupId) return { error: "Missing group" };
  if (!type) return { error: "Missing deliverable type" };
  if (!(file instanceof File) || file.size === 0) return { error: "Select a file to upload" };
  if (file.size > MAX_SIZE_BYTES) return { error: "File is too large" };

  const supabase = await createClient();
  const path = `${groupId}/${type}-${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("fyp-deliverables").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const { error } = await supabase.from("fyp_deliverables").insert({ fyp_group_id: groupId, type, file_path: path });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/student/fyp");
  return {};
}
