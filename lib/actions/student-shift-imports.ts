"use server";

import { createHash } from "crypto";
import { Readable } from "stream";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { confirmStudentShiftImportSchema } from "@/lib/validations/student-shift-imports";
import type { ActionResult } from "@/lib/actions/auth";
import { logAudit } from "@/lib/actions/audit";
import type { Database } from "@/types/database.types";

const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024; // matches the "student-shift-imports" bucket's file_size_limit
const ALLOWED_IMPORT_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

// Fixed column mapping, case/whitespace-insensitive — mirrors
// lib/actions/fee-imports.ts's HEADER_MAP exactly. Only Registration
// Number is required; Shift/Group/Section are each independently
// optional per row (a row can update just one of the three).
const HEADER_MAP: Record<string, "registrationNumber" | "shiftCode" | "groupCode" | "sectionCode"> = {
  "registration number": "registrationNumber",
  "shift": "shiftCode",
  "group": "groupCode",
  "section": "sectionCode",
};

type ParsedRow = {
  rowNumber: number;
  registrationNumber: string | null;
  shiftCode: string | null;
  groupCode: string | null;
  sectionCode: string | null;
  status: Database["public"]["Enums"]["student_import_row_status"];
  errorMessage: string | null;
};

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text).trim() || null;
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result).trim() || null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export type UploadStudentShiftImportResult = ActionResult & { importId?: string };

export async function uploadStudentShiftImportAction(formData: FormData): Promise<UploadStudentShiftImportResult> {
  const profile = await requireRole("admin", "principal", "department", "focal_person_intermediate");
  if (!profile.collegeId) return { error: "Your account has no college assigned" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select a CSV or Excel file to upload" };
  if (file.size > MAX_IMPORT_SIZE_BYTES) return { error: "File is too large (max 2MB)" };
  if (!ALLOWED_IMPORT_TYPES.includes(file.type)) return { error: "Accepted formats: .csv, .xlsx, .xls" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const supabase = await createClient();

  // Short-circuit before touching Storage at all if this exact file was
  // already uploaded (same duplicate-upload guard as the bank import).
  const { data: existingImport } = await supabase.from("student_shift_imports").select("id").eq("file_hash", fileHash).maybeSingle();
  if (existingImport) return { error: "This exact file has already been uploaded." };

  const workbook = new ExcelJS.Workbook();
  try {
    if (file.type === "text/csv") {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      // exceljs's bundled type defs predate @types/node's Buffer<ArrayBufferLike>
      // generic and don't accept it structurally — functionally identical at runtime.
      // @ts-expect-error see comment above
      await workbook.xlsx.load(buffer);
    }
  } catch {
    return { error: "Could not read this file — make sure it's a valid .csv/.xlsx/.xls export." };
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
  if (!columnIndex.registrationNumber) {
    return { error: 'The file must have a "Registration Number" column.' };
  }

  const rows: ParsedRow[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const registrationNumber = columnIndex.registrationNumber ? cellText(row.getCell(columnIndex.registrationNumber).value) : null;
    const shiftCode = columnIndex.shiftCode ? cellText(row.getCell(columnIndex.shiftCode).value)?.toLowerCase() ?? null : null;
    const groupCode = columnIndex.groupCode ? cellText(row.getCell(columnIndex.groupCode).value)?.toLowerCase() ?? null : null;
    const sectionCode = columnIndex.sectionCode ? cellText(row.getCell(columnIndex.sectionCode).value)?.toLowerCase() ?? null : null;

    if (registrationNumber === null && shiftCode === null && groupCode === null && sectionCode === null) return; // skip blank rows

    let status: ParsedRow["status"] = "valid";
    let errorMessage: string | null = null;
    if (!registrationNumber) {
      status = "invalid";
      errorMessage = "Missing registration number";
    } else if (!shiftCode && !groupCode && !sectionCode) {
      status = "invalid";
      errorMessage = "Row has no Shift, Group, or Section value to apply";
    }

    rows.push({ rowNumber, registrationNumber, shiftCode, groupCode, sectionCode, status, errorMessage });
  });

  if (rows.length === 0) return { error: "No data rows found in the file." };

  const { data: importRow, error: insertError } = await supabase
    .from("student_shift_imports")
    .insert({
      college_id: profile.collegeId,
      uploaded_by: profile.id,
      original_filename: file.name,
      file_hash: fileHash,
      status: "uploaded",
      total_rows: rows.length,
      valid_rows: rows.filter((r) => r.status === "valid").length,
      invalid_rows: rows.filter((r) => r.status === "invalid").length,
    })
    .select("id")
    .single();
  if (insertError || !importRow) return { error: insertError?.message ?? "Could not record this import." };

  const storagePath = `${importRow.id}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("student-shift-imports")
    .upload(storagePath, buffer, { contentType: file.type });
  if (uploadError) {
    await supabase.from("student_shift_imports").delete().eq("id", importRow.id);
    return { error: "Upload failed. Please try again." };
  }

  const { error: rowsError } = await supabase.from("student_shift_import_rows").insert(
    rows.map((r) => ({
      import_id: importRow.id,
      row_number: r.rowNumber,
      registration_number: r.registrationNumber,
      shift_code: r.shiftCode,
      group_code: r.groupCode,
      section_code: r.sectionCode,
      status: r.status,
      error_message: r.errorMessage,
    })),
  );
  if (rowsError) return { error: rowsError.message };

  await supabase.from("student_shift_imports").update({ status: "previewed", file_path: storagePath }).eq("id", importRow.id);

  await logAudit(profile.id, "upload_student_shift_import", "student_shift_imports", importRow.id, {
    filename: file.name,
    totalRows: rows.length,
  });
  revalidatePath("/dashboard/students/import");
  return { importId: importRow.id };
}

export async function confirmStudentShiftImportAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal", "department", "focal_person_intermediate");

  const parsed = confirmStudentShiftImportSchema.safeParse({ importId: formData.get("importId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("process_student_shift_import", { p_import_id: parsed.data.importId });
  if (error) return { error: error.message };

  await logAudit(profile.id, "confirm_student_shift_import", "student_shift_imports", parsed.data.importId);
  revalidatePath("/dashboard/students/import");
  revalidatePath("/dashboard", "layout");
  return {};
}
