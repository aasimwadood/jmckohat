import { z } from "zod";

export const submitResultSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  quiz1: z.coerce.number().min(0).max(100),
  quiz2: z.coerce.number().min(0).max(100),
  midterm: z.coerce.number().min(0).max(100),
  assignmentsScore: z.coerce.number().min(0).max(100),
});
