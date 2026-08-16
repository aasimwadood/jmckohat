import { z } from "zod";

export const enrollStudentsSchema = z.object({
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  studentProfileIds: z.array(z.string().uuid()).min(1, "Select at least one student"),
});
export type EnrollStudentsInput = z.infer<typeof enrollStudentsSchema>;

export const updateEnrollmentStatusSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.enum(["active", "completed", "dropped"]),
});
export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusSchema>;
