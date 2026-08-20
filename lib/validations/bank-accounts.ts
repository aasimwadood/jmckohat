import { z } from "zod";

export const upsertBankAccountSchema = z.object({
  id: z.string().uuid().optional(),
  bankName: z.string().trim().min(1, "Bank name is required").max(100),
  accountTitle: z.string().trim().max(150).optional().or(z.literal("")),
  accountNumber: z.string().trim().min(1, "Account number is required").max(60),
});

export const deleteBankAccountSchema = z.object({
  id: z.string().uuid(),
});
