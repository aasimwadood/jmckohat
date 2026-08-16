"use server";

import { createClient } from "@/lib/supabase/server";
import { contactMessageSchema } from "@/lib/validations/contact";
import type { ActionResult } from "@/lib/actions/auth";

export async function sendContactMessageAction(formData: FormData): Promise<ActionResult> {
  const parsed = contactMessageSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.website) {
    return {};
  }

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone_number: parsed.data.phoneNumber || null,
    subject: parsed.data.subject || null,
    body: parsed.data.body,
  });

  if (error) return { error: "Failed to send message. Please try again." };
  return {};
}
