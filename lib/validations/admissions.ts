import { z } from "zod";

export const MERIT_CATEGORIES = [
  "open_merit",
  "local_area",
  "special_merit",
  "sports_quota",
  "college_employee_child",
  "minority_quota",
  "disabled_person_quota",
] as const;

export const createAdmissionSchema = z.object({
  departmentId: z.string().uuid(),
  programId: z.string().uuid().optional().or(z.literal("")),
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  cnic: z.string().trim().max(20).optional().or(z.literal("")),
  contactNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  meritCategory: z.enum(MERIT_CATEGORIES),
  meritNumber: z.coerce.number().int().optional(),
});

export const approveFeeSchema = z.object({
  admissionId: z.string().uuid(),
  receiptNumber: z.string().trim().min(1, "Receipt number is required"),
});

export const cancelAdmissionSchema = z.object({
  admissionId: z.string().uuid(),
  reason: z.string().trim().min(1, "A cancellation reason is required"),
});

export const uploadAdmissionDocumentSchema = z.object({
  admissionId: z.string().uuid(),
  label: z.string().trim().min(1, "A document label is required").max(100),
});
