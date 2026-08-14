"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function createCalendarEventAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("coordinator", "admin");

  const title = formData.get("title");
  const eventDate = formData.get("eventDate");
  const description = formData.get("description");
  if (typeof title !== "string" || !title.trim()) return { error: "Title is required" };
  if (typeof eventDate !== "string" || !eventDate) return { error: "Select a date" };

  const supabase = await createClient();
  const { error } = await supabase.from("academic_calendar_events").insert({
    title: title.trim(),
    description: typeof description === "string" && description ? description : null,
    event_date: eventDate,
    created_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/coordinator/calendar");
  return {};
}
