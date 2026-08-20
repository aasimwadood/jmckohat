import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdmissionsView } from "@/components/features/admissions/admissions-view";
import type { AdmissionRow } from "@/components/features/admissions/types";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function FocalPersonAdmissionsPage() {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: activeSession } = await supabase.from("academic_sessions").select("id").eq("is_active", true).single();

  const [{ data: settings }, { data: programs }, { data: admissions }, { data: shifts }, { data: groups }, { data: sections }] = await Promise.all([
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
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("groups").select("id, name").eq("department_id", profile.departmentId).order("sort_order"),
    supabase.from("sections").select("id, name, group_id").eq("department_id", profile.departmentId).order("sort_order"),
  ]);

  const programNames = new Map((programs ?? []).map((p) => [p.id, p.name]));

  const admissionIds = (admissions ?? []).map((a) => a.id);
  const { data: vouchers } =
    admissionIds.length > 0
      ? await supabase.from("fee_vouchers").select("id, admission_id, voucher_number, status").in("admission_id", admissionIds)
      : { data: [] };
  const voucherByAdmission = new Map((vouchers ?? []).map((v) => [v.admission_id, v]));

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
    shiftId: a.shift_id,
    groupId: a.group_id,
    sectionId: a.section_id,
    voucher: (() => {
      const v = voucherByAdmission.get(a.id);
      return v ? { id: v.id, voucherNumber: v.voucher_number, status: v.status } : null;
    })(),
  }));

  return (
    <>
      <LiveRefresh table="admissions" filter={`department_id=eq.${profile.departmentId}`} />
      <AdmissionsView
        role="focal_person_intermediate"
        departmentId={profile.departmentId}
        academicSessionId={activeSession?.id ?? null}
        isEnabled={settings?.is_enabled ?? false}
        programs={programs ?? []}
        shifts={shifts ?? []}
        groups={groups ?? []}
        sections={(sections ?? []).map((s) => ({ id: s.id, name: s.name, groupId: s.group_id }))}
        admissions={rows}
      />
    </>
  );
}
