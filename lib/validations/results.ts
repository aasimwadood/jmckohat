import { z } from "zod";

// Matches the documented assessment weightage (app/dashboard/controller/policies):
// Quizzes 15% (split 7.5 each), Assignments 15%, Midterm 30%, Final 40%.
export const submitResultSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  quiz1: z.coerce.number().min(0).max(7.5),
  quiz2: z.coerce.number().min(0).max(7.5),
  midterm: z.coerce.number().min(0).max(30),
  assignmentsScore: z.coerce.number().min(0).max(15),
});

export const setFinalExamMarkSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  finalExam: z.coerce.number().min(0).max(40),
});
