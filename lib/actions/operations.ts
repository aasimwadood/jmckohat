"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { libraryItemSchema, campusEventSchema } from "@/lib/validations/operations";
import type { ActionResult } from "@/lib/actions/auth";

export async function addLibraryItemAction(formData: FormData): Promise<ActionResult> {
  await requireRole("administration", "admin");

  const parsed = libraryItemSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    isbn: formData.get("isbn"),
    totalCopies: formData.get("totalCopies"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("library_items").insert({
    title: parsed.data.title,
    author: parsed.data.author || null,
    isbn: parsed.data.isbn || null,
    total_copies: parsed.data.totalCopies,
    available_copies: parsed.data.totalCopies,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/administration/library");
  return {};
}

export async function updateTicketStatusAction(ticketId: string, status: "in_progress" | "resolved" | "closed"): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      resolved_by: status === "resolved" ? profile.id : undefined,
      resolved_at: status === "resolved" ? new Date().toISOString() : undefined,
    })
    .eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/administration/helpdesk");
  return {};
}

export async function createCampusEventAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = campusEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("campus_events").insert({
    title: parsed.data.title,
    description: parsed.data.description || null,
    event_date: parsed.data.eventDate,
    location: parsed.data.location || null,
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/administration/events");
  return {};
}
