import { z } from "zod";

export const createCourseSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20),
  title: z.string().trim().min(1, "Title is required").max(200),
  credits: z.coerce.number().int().min(1).max(10),
  programId: z.string().uuid().nullable(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const assignTeacherSchema = z.object({
  courseId: z.string().uuid(),
  facultyProfileId: z.string().uuid(),
  semesterId: z.string().uuid(),
});
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;

export const removeTeacherAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  facultyProfileId: z.string().uuid(),
  semesterId: z.string().uuid(),
});
export type RemoveTeacherAssignmentInput = z.infer<typeof removeTeacherAssignmentSchema>;
