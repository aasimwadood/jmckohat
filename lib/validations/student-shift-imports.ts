import { z } from "zod";

export const confirmStudentShiftImportSchema = z.object({
  importId: z.string().uuid(),
});

// One parsed+validated row from the uploaded file, before it's persisted
// to student_shift_import_rows. Column mapping happens in
// lib/actions/student-shift-imports.ts.
export const studentShiftImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  registrationNumber: z.string().trim().min(1).nullable(),
  shiftCode: z.string().trim().min(1).nullable(),
  groupCode: z.string().trim().min(1).nullable(),
  sectionCode: z.string().trim().min(1).nullable(),
});
