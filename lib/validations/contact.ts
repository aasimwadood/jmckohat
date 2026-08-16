import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phoneNumber: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  body: z.string().trim().min(1, "Message is required").max(5000),
  // Honeypot: real visitors never see or fill this field (hidden off-screen
  // in the form UI). A bot that fills every input trips it; the action
  // reports success without ever inserting the row.
  website: z.string().trim().max(200).optional().or(z.literal("")),
});
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
