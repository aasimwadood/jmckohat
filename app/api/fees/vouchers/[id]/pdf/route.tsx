import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { VoucherDocument, type VoucherPdfData } from "@/components/features/fees/voucher-document";
import { semesterLabel } from "@/lib/utils/degree-level";

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

  const { data: components } = await supabase
    .from("fee_voucher_components")
    .select("name, amount")
    .eq("fee_voucher_id", voucher.id)
    .order("sort_order");

  // Two sources feed the same voucher shape: a promotion (existing/promoted
  // BS student, identity via profiles) or a new admission (identity lives
  // on the admission itself — no profiles row may exist yet).
  let studentName: string;
  let fatherName: string | null;
  let registrationNumber: string | null;
  let departmentId: string | null;
  let programId: string | null;
  let collegeId: string | null;
  let semesterNumber: number;
  let academicSessionId: string | null;

  if (voucher.promotion_id) {
    const { data: promotion } = await supabase.from("promotions").select("to_semester_id").eq("id", voucher.promotion_id).single();
    const { data: student } = await supabase
      .from("profiles")
      .select("full_name, father_name, registration_number, department_id, program_id, college_id")
      .eq("id", voucher.student_profile_id!)
      .single();
    if (!student) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    const { data: semester } = promotion?.to_semester_id
      ? await supabase.from("semesters").select("number, academic_session_id").eq("id", promotion.to_semester_id).single()
      : { data: null };

    studentName = student.full_name;
    fatherName = student.father_name;
    registrationNumber = student.registration_number;
    departmentId = student.department_id;
    programId = student.program_id;
    collegeId = student.college_id;
    semesterNumber = semester?.number ?? 0;
    academicSessionId = semester?.academic_session_id ?? null;
  } else {
    const { data: admission } = await supabase
      .from("admissions")
      .select("full_name, father_name, temporary_id, registration_number, department_id, program_id")
      .eq("id", voucher.admission_id!)
      .single();
    if (!admission) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    const { data: activeSession } = await supabase.from("academic_sessions").select("id").eq("is_active", true).single();
    const { data: department } = admission.department_id
      ? await supabase.from("departments").select("college_id").eq("id", admission.department_id).single()
      : { data: null };

    studentName = admission.full_name;
    fatherName = admission.father_name;
    registrationNumber = admission.registration_number ?? admission.temporary_id;
    departmentId = admission.department_id;
    programId = admission.program_id;
    collegeId = department?.college_id ?? null;
    semesterNumber = 1;
    academicSessionId = activeSession?.id ?? null;
  }

  const [{ data: department }, { data: program }, { data: college }] = await Promise.all([
    departmentId ? supabase.from("departments").select("name").eq("id", departmentId).single() : Promise.resolve({ data: null }),
    programId ? supabase.from("programs").select("name, degree_level").eq("id", programId).single() : Promise.resolve({ data: null }),
    collegeId
      ? supabase.from("colleges").select("name, address, contact_number, logo_path").eq("id", collegeId).single()
      : Promise.resolve({ data: null }),
  ]);

  const academicSession = academicSessionId
    ? (await supabase.from("academic_sessions").select("label").eq("id", academicSessionId).single()).data?.label
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
    studentName,
    fatherName,
    registrationNumber,
    programName: program?.name ?? "—",
    departmentName: department?.name ?? "—",
    semesterLabel: semesterLabel(semesterNumber, program?.degree_level),
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
