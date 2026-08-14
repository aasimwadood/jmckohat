import { z } from "zod";

export const libraryItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  author: z.string().trim().max(200).optional().or(z.literal("")),
  isbn: z.string().trim().max(50).optional().or(z.literal("")),
  totalCopies: z.coerce.number().int().min(1),
});

export const campusEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  eventDate: z.string().min(1, "Select a date"),
  location: z.string().trim().max(200).optional().or(z.literal("")),
});
