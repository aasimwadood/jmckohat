import { z } from "zod";

export const FINE_TYPES = ["attendance_fine", "proctorial_fine", "library_fine"] as const;

export const addFineSchema = z.object({
  studentId: z.string().uuid(),
  fineType: z.enum(FINE_TYPES),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  notes: z.string().trim().min(3, "Provide a brief reason (at least 3 characters)"),
});
