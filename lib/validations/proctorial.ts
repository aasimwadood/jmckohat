import { z } from "zod";

export const assignDutySchema = z.object({
  assignedTo: z.string().uuid(),
  departmentId: z.string().uuid().nullable(),
  dutyType: z.string().trim().min(1, "Duty type is required").max(100),
  dutyDate: z.string().min(1, "Date is required"),
  shiftTime: z.string().trim().max(100).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type AssignDutyInput = z.infer<typeof assignDutySchema>;

export const updateDutyStatusSchema = z.object({
  dutyId: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "missed", "cancelled"]),
});
export type UpdateDutyStatusInput = z.infer<typeof updateDutyStatusSchema>;

export const fileComplaintSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(2000),
  againstStudentId: z.string().uuid().nullable(),
});
export type FileComplaintInput = z.infer<typeof fileComplaintSchema>;

export const updateComplaintStatusSchema = z.object({
  complaintId: z.string().uuid(),
  status: z.enum(["open", "reviewed", "resolved"]),
});
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
