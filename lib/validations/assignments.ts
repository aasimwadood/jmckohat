import { z } from "zod";

export const createAssignmentSchema = z.object({
  courseId: z.string().uuid("Select a course"),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  dueDate: z.string().min(1, "Due date is required"),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  grade: z.coerce.number().min(0).max(1000),
});
