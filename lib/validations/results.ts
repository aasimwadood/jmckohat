import { z } from "zod";

// Real weightage: Internal 25% (Quizzes/Assignments/Presentation — split
// however the teacher wants within that pool, no fixed per-field cap) +
// Midterm 25% + External Final 50%. The DB enforces the real constraint
// (quiz1+quiz2+assignments_score+presentation <= 25, see 0060) — these
// per-field .max(25) bounds are just a sane UI ceiling for one field
// alone, not the actual rule.
export const submitResultSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  quiz1: z.coerce.number().min(0).max(25),
  quiz2: z.coerce.number().min(0).max(25),
  assignmentsScore: z.coerce.number().min(0).max(25),
  presentation: z.coerce.number().min(0).max(25),
  midterm: z.coerce.number().min(0).max(25),
});

export const setFinalExamMarkSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  finalExam: z.coerce.number().min(0).max(50),
});
