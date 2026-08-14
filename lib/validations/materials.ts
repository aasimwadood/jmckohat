import { z } from "zod";

export const MATERIAL_TYPES = ["lecture_slides", "notes", "assignment", "reference", "other"] as const;

export const materialFormSchema = z.object({
  courseId: z.string().uuid("Select a course"),
  title: z.string().trim().min(1, "Title is required").max(300),
  type: z.enum(MATERIAL_TYPES),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});
