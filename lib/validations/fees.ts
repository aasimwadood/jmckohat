import { z } from "zod";

export const feeComponentSchema = z.object({
  name: z.string().trim().min(1, "Component name is required"),
  amount: z.coerce.number().min(0, "Amount must be zero or more"),
});

export const upsertFeeStructureSchema = z.object({
  programId: z.string().uuid(),
  semesterNumber: z.coerce.number().int().min(1).max(8),
  academicSessionId: z.string().uuid(),
  components: z.array(feeComponentSchema).min(1, "Add at least one fee component"),
});

export const generateVoucherSchema = z.object({
  promotionId: z.string().uuid(),
});

export const generateAdmissionVoucherSchema = z.object({
  admissionId: z.string().uuid(),
});

export const generateCustomVoucherSchema = z.object({
  studentId: z.string().uuid(),
  reason: z.string().trim().min(3, "Provide a reason (at least 3 characters)"),
  components: z.array(feeComponentSchema).min(1, "Add at least one fee component"),
});

export const manuallyClearAdmissionFeeSchema = z.object({
  admissionId: z.string().uuid(),
  reason: z.string().trim().min(5, "Provide a brief reason (at least 5 characters)"),
});

export const manuallyClearPromotionFeeSchema = z.object({
  promotionId: z.string().uuid(),
  reason: z.string().trim().min(5, "Provide a brief reason (at least 5 characters)"),
});

export const resolveVoucherSchema = z.object({
  voucherId: z.string().uuid(),
  action: z.enum(["verify", "cancel"]),
  reason: z.string().trim().min(5, "Provide a brief reason (at least 5 characters)"),
});

export const finalizePromotionSchema = z.object({
  promotionId: z.string().uuid(),
  receiptNumber: z.string().trim().optional(),
});
