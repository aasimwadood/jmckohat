import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SelectionView } from "@/components/features/recruitment/selection-view";

export default async function PositionSelectionPage({
  params,
}: {
  params: Promise<{ adId: string; positionId: string }>;
}) {
  const { adId, positionId } = await params;
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
  const supabase = await createClient();

  const { data: position } = await supabase
    .from("recruitment_positions")
    .select("id, title, advertisement_id, vacancies")
    .eq("id", positionId)
    .single();
  if (!position || position.advertisement_id !== adId) notFound();

  const { data: advertisement } = await supabase
    .from("recruitment_advertisements")
    .select("college_id")
    .eq("id", adId)
    .single();
  if (!advertisement || advertisement.college_id !== profile.collegeId) notFound();

  const { data: applications } = await supabase
    .from("recruitment_applications")
    .select("id, application_number, status, final_rank, applicant_id")
    .eq("position_id", positionId)
    .in("status", ["interview_completed", "selected", "waiting_list", "not_selected", "appointment_issued"])
    .order("final_rank", { ascending: true, nullsFirst: false });

  const applicantIds = (applications ?? []).map((a) => a.applicant_id);
  const { data: applicants } = applicantIds.length
    ? await supabase.from("applicant_profiles").select("id, full_name").in("id", applicantIds)
    : { data: [] };
  const applicantById = new Map((applicants ?? []).map((a) => [a.id, a.full_name]));

  const applicationIds = (applications ?? []).map((a) => a.id);
  const { data: orders } = applicationIds.length
    ? await supabase.from("recruitment_appointment_orders").select("application_id, order_number, issued_date").in("application_id", applicationIds)
    : { data: [] };
  const orderByApplication = new Map((orders ?? []).map((o) => [o.application_id, o]));

  const rows = (applications ?? []).map((a) => ({
    id: a.id,
    applicationNumber: a.application_number,
    applicantName: applicantById.get(a.applicant_id) ?? "Unknown",
    status: a.status,
    finalRank: a.final_rank,
    orderNumber: orderByApplication.get(a.id)?.order_number ?? null,
    issuedDate: orderByApplication.get(a.id)?.issued_date ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href={`/dashboard/recruitment/${adId}`} className="text-sm text-blue-600 hover:underline">
        ← {position.title}
      </Link>
      <SelectionView
        positionId={positionId}
        positionTitle={position.title}
        vacancies={position.vacancies}
        applications={rows}
        canIssueAppointments={["principal", "college_admin", "admin"].includes(profile.role)}
      />
    </div>
  );
}
