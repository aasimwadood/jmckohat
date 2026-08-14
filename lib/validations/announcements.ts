import { z } from "zod";

export const createAnnouncementSchema = z.object({
  courseId: z.string().uuid("Select a course"),
  title: z.string().trim().min(1, "Title is required").max(300),
  body: z.string().trim().min(1, "Content is required").max(5000),
});
