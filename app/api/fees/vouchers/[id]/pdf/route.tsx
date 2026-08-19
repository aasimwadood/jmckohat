import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { VoucherDocument, type VoucherPdfData } from "@/components/features/fees/voucher-document";

async function loadLogoDataUri(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null;
  try {
    if (logoPath.startsWith("http")) {
      const res = await fetch(logoPath);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "image/png";
      const buffer = Buffer.from(await res.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }
    const filePath = path.join(process.cwd(), "public", logoPath.replace(/^\//, ""));
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
    if (contentType === "image/svg+xml") return null; // react-pdf's Image doesn't support SVG
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// Generates the fee voucher as a real PDF (RLS-scoped, same auth pattern as
// app/api/fees/receipt/[id]/route.ts) so a student can only ever download
// their own voucher — no query param or role check needed beyond RLS
// itself, matching that route's own reasoning.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: voucher, error } = await supabase.from("fee_vouchers").select("*").eq("id", id).single();
  if (error || !voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

  const [{ data: components }, { data: promotion }, { data: student }] = await Promise.all([
    supabase.from("fee_voucher_components").select("name, amount").eq("fee_voucher_id", voucher.id).order("sort_order"),
    supabase.from("promotions").select("to_semester_id").eq("id", voucher.promotion_id).single(),
    supabase
      .from("profiles")
      .select("full_name, father_name, registration_number, department_id, program_id, college_id")
      .eq("id", voucher.student_profile_id)
      .single(),
  ]);
  if (!student) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

  const [{ data: semester }, { data: department }, { data: program }, { data: college }] = await Promise.all([
    promotion?.to_semester_id
      ? supabase.from("semesters").select("number, academic_session_id").eq("id", promotion.to_semester_id).single()
      : Promise.resolve({ data: null }),
    student.department_id ? supabase.from("departments").select("name").eq("id", student.department_id).single() : Promise.resolve({ data: null }),
    student.program_id ? supabase.from("programs").select("name").eq("id", student.program_id).single() : Promise.resolve({ data: null }),
    student.college_id
      ? supabase.from("colleges").select("name, address, contact_number, logo_path").eq("id", student.college_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const academicSession = semester?.academic_session_id
    ? (await supabase.from("academic_sessions").select("label").eq("id", semester.academic_session_id).single()).data?.label
    : null;

  const logoDataUri = await loadLogoDataUri(college?.logo_path ?? "/images/logo.png");

  const data: VoucherPdfData = {
    collegeName: college?.name ?? "GPGC Kohat",
    collegeAddress: college?.address ?? null,
    collegeContact: college?.contact_number ?? null,
    logoDataUri,
    voucherNumber: voucher.voucher_number,
    status: voucher.status,
    dueDate: new Date(voucher.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    generatedAt: new Date(voucher.generated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    studentName: student.full_name,
    fatherName: student.father_name,
    registrationNumber: student.registration_number,
    programName: program?.name ?? "—",
    departmentName: department?.name ?? "—",
    semesterNumber: semester?.number ?? 0,
    academicSession: academicSession ?? "—",
    components: components ?? [],
    totalAmount: voucher.total_amount,
  };

  const buffer = await renderToBuffer(<VoucherDocument data={data} />);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="voucher_${voucher.voucher_number}.pdf"`,
    },
  });
}
