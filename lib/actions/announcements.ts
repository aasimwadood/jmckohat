"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";
import type { AnnouncementScopeEnum } from "@/types/database.types";

/**
 * One action for every announcement scope (course/department/institution).
 * RLS is the real gate here (announcements_write_staff in
 * 0008_operations.sql) — this just shapes the row; a faculty account
 * trying to post an institution-wide announcement gets rejected by the
 * database, not by client-side role branching.
 */
export async function createAnnouncementAction(
  scope: AnnouncementScopeEnum,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in" };

  const title = formData.get("title");
  const body = formData.get("body");
  if (typeof title !== "string" || !title.trim()) return { error: "Title is required" };
  if (typeof body !== "string" || !body.trim()) return { error: "Content is required" };

  const courseId = formData.get("courseId");
  const departmentId = formData.get("departmentId");

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    author_profile_id: profile.id,
    scope,
    title: title.trim(),
    body: body.trim(),
    course_id: scope === "course" && typeof courseId === "string" ? courseId : null,
    department_id: scope === "department" && typeof departmentId === "string" ? departmentId : null,
    published_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {};
}
