import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ApplicationsView } from "@/components/features/recruitment/applications-view";
import type { ApplicationRow, MeritCriterionRow, RequiredDocumentRow } from "@/components/features/recruitment/types";

export default async function PositionApplicationsPage({
  params,
}: {
  params: Promise<{ adId: string; positionId: string }>;
}) {
  const { adId, positionId } = await params;
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
  const supabase = await createClient();

  const { data: position } = await supabase
    .from("recruitment_positions")
    .select("id, title, advertisement_id")
    .eq("id", positionId)
    .single();

  if (!position || position.advertisement_id !== adId) notFound();

  const { data: advertisement } = await supabase
    .from("recruitment_advertisements")
    .select("college_id")
    .eq("id", adId)
    .single();
  if (!advertisement || advertisement.college_id !== profile.collegeId) notFound();

  const [{ data: applications }, { data: criteria }, { data: requiredDocs }, { data: meritTotals }] = await Promise.all([
    supabase
      .from("recruitment_applications")
      .select("id, application_number, status, eligibility_status, scrutiny_remarks, qualification, submitted_at, final_rank, applicant_id")
      .eq("position_id", positionId)
      .neq("status", "draft")
      .order("submitted_at", { ascending: true }),
    supabase.from("recruitment_merit_criteria").select("id, name, max_score").eq("position_id", positionId).order("sort_order"),
    supabase.from("recruitment_required_documents").select("id, document_type, is_mandatory").eq("position_id", positionId),
    supabase.from("recruitment_application_merit_totals").select("application_id, total_score"),
  ]);

  const applicantIds = (applications ?? []).map((a) => a.applicant_id);
  const { data: applicants } = applicantIds.length
    ? await supabase.from("applicant_profiles").select("id, full_name, email").in("id", applicantIds)
    : { data: [] };
  const applicantById = new Map((applicants ?? []).map((a) => [a.id, a]));
  const meritByApplication = new Map((meritTotals ?? []).map((m) => [m.application_id, m.total_score]));

  const rows: ApplicationRow[] = (applications ?? []).map((a) => {
    const applicant = applicantById.get(a.applicant_id);
    return {
      id: a.id,
      applicationNumber: a.application_number,
      applicantName: applicant?.full_name ?? "Unknown",
      applicantEmail: applicant?.email ?? "",
      status: a.status,
      eligibilityStatus: a.eligibility_status,
      scrutinyRemarks: a.scrutiny_remarks,
      qualification: a.qualification,
      submittedAt: a.submitted_at,
      meritTotal: meritByApplication.get(a.id) ?? null,
      finalRank: a.final_rank,
    };
  });

  const criteriaRows: MeritCriterionRow[] = (criteria ?? []).map((c) => ({ id: c.id, name: c.name, maxScore: c.max_score }));
  const requiredDocRows: RequiredDocumentRow[] = (requiredDocs ?? []).map((d) => ({
    id: d.id,
    documentType: d.document_type,
    isMandatory: d.is_mandatory,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Link href={`/dashboard/recruitment/${adId}`} className="text-sm text-blue-600 hover:underline">
        ← {position.title}
      </Link>
      <ApplicationsView
        positionId={positionId}
        positionTitle={position.title}
        applications={rows}
        criteria={criteriaRows}
        requiredDocuments={requiredDocRows}
      />
    </div>
  );
}
