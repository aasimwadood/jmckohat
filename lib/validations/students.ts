import { z } from "zod";

export const bulkAssignStudentShiftSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, "Select at least one student"),
  shiftId: z.string().uuid().optional().or(z.literal("")),
});

export const bulkAssignStudentPlacementSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, "Select at least one student"),
  groupId: z.string().uuid().optional().or(z.literal("")),
  sectionId: z.string().uuid().optional().or(z.literal("")),
});
