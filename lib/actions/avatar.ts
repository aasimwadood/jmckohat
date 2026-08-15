"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { ROLE_DASHBOARD_PATH } from "@/lib/permissions/roles";
import type { ActionResult } from "@/lib/actions/auth";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // matches the "avatars" bucket's file_size_limit
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select an image to upload" };
  if (file.size > MAX_SIZE_BYTES) return { error: "Image is too large (max 2MB)" };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Accepted formats: PNG, JPEG, WEBP" };

  const supabase = await createClient();
  const extension = file.name.split(".").pop() ?? "png";
  const path = `${profile.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", profile.id);
  if (error) return { error: error.message };

  revalidatePath(ROLE_DASHBOARD_PATH[profile.role]);
  return {};
}
