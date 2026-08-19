import { z } from "zod";

export const confirmBankImportSchema = z.object({
  importId: z.string().uuid(),
});

// One parsed+validated row from the uploaded Excel, before it's persisted
// to fee_bank_import_rows. Column mapping happens in lib/actions/fee-imports.ts.
export const bankImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  voucherNumber: z.string().trim().min(1).nullable(),
  studentIdentifier: z.string().trim().min(1).nullable(),
  amount: z.number().nonnegative().nullable(),
  transactionDate: z.string().nullable(),
  transactionReference: z.string().trim().nullable(),
});
