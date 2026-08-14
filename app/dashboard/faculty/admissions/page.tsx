import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdmissionsView } from "@/components/features/admissions/admissions-view";
import type { AdmissionRow } from "@/components/features/admissions/types";

export default async function FacultyAdmissionsPage() {
  const profile = await requireRole("faculty");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          You are not assigned to a department yet.
        </CardContent>
      </Card>
    );
  }

  const { data: activeSession } = await supabase.from("academic_sessions").select("id").eq("is_active", true).single();

  const [{ data: settings }, { data: programs }, { data: admissions }] = await Promise.all([
    activeSession
      ? supabase
          .from("admission_settings")
          .select("is_enabled")
          .eq("department_id", profile.departmentId)
          .eq("academic_session_id", activeSession.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("programs").select("id, name").eq("department_id", profile.departmentId),
    supabase.from("admissions").select("*").eq("department_id", profile.departmentId).order("created_at", { ascending: false }),
  ]);

  const programNames = new Map((programs ?? []).map((p) => [p.id, p.name]));

  const rows: AdmissionRow[] = (admissions ?? []).map((a) => ({
    id: a.id,
    temporaryId: a.temporary_id,
    fullName: a.full_name,
    cnic: a.cnic,
    contactNumber: a.contact_number,
    email: a.email,
    programName: a.program_id ? (programNames.get(a.program_id) ?? null) : null,
    meritCategory: a.merit_category,
    meritNumber: a.merit_number,
    status: a.status,
    registrationNumber: a.registration_number,
    feeReceiptNumber: a.fee_receipt_number,
    totalFee:
      a.registration_fee + a.crf_fee + a.admission_fee + a.tuition_fee + a.examination_fee + a.hostel_fee + a.transport_fee,
  }));

  return (
    <AdmissionsView
      role="faculty"
      departmentId={profile.departmentId}
      academicSessionId={activeSession?.id ?? null}
      isEnabled={settings?.is_enabled ?? false}
      programs={programs ?? []}
      admissions={rows}
    />
  );
}
