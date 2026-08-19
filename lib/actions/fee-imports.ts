"use server";

import { createHash } from "crypto";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { confirmBankImportSchema } from "@/lib/validations/fee-imports";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";
import type { Database } from "@/types/database.types";

const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024; // matches the "fee-bank-imports" bucket's file_size_limit
const ALLOWED_IMPORT_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

// Fixed column mapping (spec §15) — the bank's Excel must use these exact
// headers (case/whitespace-insensitive). A configurable per-import mapping
// UI is a reasonable Phase 2 addition if a real bank format doesn't match.
const HEADER_MAP: Record<string, "voucherNumber" | "studentIdentifier" | "amount" | "transactionDate" | "transactionReference"> = {
  "voucher number": "voucherNumber",
  "student id": "studentIdentifier",
  "amount paid": "amount",
  "transaction date": "transactionDate",
  "transaction reference": "transactionReference",
};

type ParsedRow = {
  rowNumber: number;
  voucherNumber: string | null;
  studentIdentifier: string | null;
  amount: number | null;
  transactionDate: string | null;
  transactionReference: string | null;
  status: Database["public"]["Enums"]["fee_import_row_status"];
  errorMessage: string | null;
};

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text).trim() || null;
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result).trim() || null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function cellDate(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = cellText(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export type UploadBankImportResult = ActionResult & { importId?: string };

export async function uploadBankImportAction(formData: FormData): Promise<UploadBankImportResult> {
  const profile = await requireRole("administration", "admin");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select a bank Excel file to upload" };
  if (file.size > MAX_IMPORT_SIZE_BYTES) return { error: "File is too large (max 5MB)" };
  if (!ALLOWED_IMPORT_TYPES.includes(file.type)) return { error: "Accepted formats: .xlsx, .xls" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const supabase = await createClient();

  // Short-circuit before touching Storage at all if this exact file was
  // already uploaded (spec §20 — duplicate-upload prevention).
  const { data: existingImport } = await supabase.from("fee_bank_imports").select("id").eq("file_hash", fileHash).maybeSingle();
  if (existingImport) return { error: "This exact file has already been uploaded." };

  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's bundled type defs predate @types/node's Buffer<ArrayBufferLike>
    // generic and don't accept it structurally — functionally identical at runtime.
    // @ts-expect-error see comment above
    await workbook.xlsx.load(buffer);
  } catch {
    return { error: "Could not read this file — make sure it's a valid .xlsx/.xls export." };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { error: "The uploaded file has no worksheet." };

  const headerRow = worksheet.getRow(1);
  const columnIndex: Partial<Record<(typeof HEADER_MAP)[keyof typeof HEADER_MAP], number>> = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = cellText(cell.value)?.toLowerCase();
    const mapped = header ? HEADER_MAP[header] : undefined;
    if (mapped) columnIndex[mapped] = colNumber;
  });
  if (!columnIndex.voucherNumber || !columnIndex.amount) {
    return { error: 'The file must have "Voucher Number" and "Amount Paid" columns.' };
  }

  const rows: ParsedRow[] = [];
  const seenReferences = new Set<string>();

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const voucherNumber = columnIndex.voucherNumber ? cellText(row.getCell(columnIndex.voucherNumber).value) : null;
    const studentIdentifier = columnIndex.studentIdentifier ? cellText(row.getCell(columnIndex.studentIdentifier).value) : null;
    const amountText = columnIndex.amount ? cellText(row.getCell(columnIndex.amount).value) : null;
    const transactionDate = columnIndex.transactionDate ? cellDate(row.getCell(columnIndex.transactionDate).value) : null;
    const transactionReference = columnIndex.transactionReference
      ? cellText(row.getCell(columnIndex.transactionReference).value)
      : null;

    if (voucherNumber === null && studentIdentifier === null && amountText === null) return; // skip blank rows

    const amount = amountText !== null && !Number.isNaN(Number(amountText)) ? Number(amountText) : null;

    let status: ParsedRow["status"] = "valid";
    let errorMessage: string | null = null;
    if (!voucherNumber) {
      status = "invalid";
      errorMessage = "Missing voucher number";
    } else if (amount === null || amount < 0) {
      status = "invalid";
      errorMessage = "Missing or invalid amount";
    } else if (transactionReference && seenReferences.has(transactionReference)) {
      status = "duplicate_row";
      errorMessage = "Duplicate transaction reference within this file";
    }

    if (transactionReference) seenReferences.add(transactionReference);

    rows.push({ rowNumber, voucherNumber, studentIdentifier, amount, transactionDate, transactionReference, status, errorMessage });
  });

  if (rows.length === 0) return { error: "No data rows found in the file." };

  const { data: importRow, error: insertError } = await supabase
    .from("fee_bank_imports")
    .insert({
      college_id: profile.collegeId,
      uploaded_by: profile.id,
      original_filename: file.name,
      file_hash: fileHash,
      status: "uploaded",
      total_rows: rows.length,
      valid_rows: rows.filter((r) => r.status === "valid").length,
      invalid_rows: rows.filter((r) => r.status === "invalid").length,
      duplicate_rows: rows.filter((r) => r.status === "duplicate_row").length,
    })
    .select("id")
    .single();
  if (insertError || !importRow) return { error: insertError?.message ?? "Could not record this import." };

  const storagePath = `${importRow.id}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("fee-bank-imports")
    .upload(storagePath, buffer, { contentType: file.type });
  if (uploadError) {
    await supabase.from("fee_bank_imports").delete().eq("id", importRow.id);
    return { error: "Upload failed. Please try again." };
  }

  const { error: rowsError } = await supabase.from("fee_bank_import_rows").insert(
    rows.map((r) => ({
      import_id: importRow.id,
      row_number: r.rowNumber,
      voucher_number: r.voucherNumber,
      student_identifier: r.studentIdentifier,
      amount: r.amount,
      transaction_date: r.transactionDate,
      transaction_reference: r.transactionReference,
      status: r.status,
      error_message: r.errorMessage,
    })),
  );
  if (rowsError) return { error: rowsError.message };

  await supabase.from("fee_bank_imports").update({ status: "previewed", file_path: storagePath }).eq("id", importRow.id);

  await logAudit(profile.id, "upload_bank_import", "fee_bank_imports", importRow.id, {
    filename: file.name,
    totalRows: rows.length,
  });
  revalidatePath("/dashboard/administration/finance/import");
  return { importId: importRow.id };
}

export async function confirmBankImportAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("administration", "admin");

  const parsed = confirmBankImportSchema.safeParse({ importId: formData.get("importId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("process_fee_bank_import", { p_import_id: parsed.data.importId });
  if (error) return { error: error.message };

  await logAudit(profile.id, "confirm_bank_import", "fee_bank_imports", parsed.data.importId);
  revalidatePath("/dashboard/administration/finance/import");
  revalidatePath("/dashboard", "layout");
  return {};
}
