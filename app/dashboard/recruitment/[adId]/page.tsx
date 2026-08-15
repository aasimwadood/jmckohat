import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdvertisementDetailView } from "@/components/features/recruitment/advertisement-detail-view";
import type { PositionRow, MeritCriterionRow, RequiredDocumentRow } from "@/components/features/recruitment/types";

export default async function AdvertisementDetailPage({ params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
  const supabase = await createClient();

  const { data: ad } = await supabase
    .from("recruitment_advertisements")
    .select("id, title, ad_number, ad_date, opening_date, closing_date, interview_date, location, description, instructions, status, college_id")
    .eq("id", adId)
    .single();

  if (!ad || ad.college_id !== profile.collegeId) notFound();

  const [{ data: positions }, { data: departments }] = await Promise.all([
    supabase
      .from("recruitment_positions")
      .select("id, title, department_id, bps_grade, vacancies, interview_shortlist_per_vacancy, required_qualification, required_experience")
      .eq("advertisement_id", adId)
      .order("created_at", { ascending: true }),
    supabase.from("departments").select("id, name").eq("college_id", profile.collegeId),
  ]);

  const deptNames = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const positionIds = (positions ?? []).map((p) => p.id);

  const [{ data: criteria }, { data: requiredDocs }] = positionIds.length
    ? await Promise.all([
        supabase.from("recruitment_merit_criteria").select("id, position_id, name, max_score").in("position_id", positionIds),
        supabase.from("recruitment_required_documents").select("id, position_id, document_type, is_mandatory").in("position_id", positionIds),
      ])
    : [{ data: [] }, { data: [] }];

  const criteriaByPosition = new Map<string, MeritCriterionRow[]>();
  (criteria ?? []).forEach((c) => {
    const list = criteriaByPosition.get(c.position_id) ?? [];
    list.push({ id: c.id, name: c.name, maxScore: c.max_score });
    criteriaByPosition.set(c.position_id, list);
  });

  const docsByPosition = new Map<string, RequiredDocumentRow[]>();
  (requiredDocs ?? []).forEach((d) => {
    const list = docsByPosition.get(d.position_id) ?? [];
    list.push({ id: d.id, documentType: d.document_type, isMandatory: d.is_mandatory });
    docsByPosition.set(d.position_id, list);
  });

  const positionRows: PositionRow[] = (positions ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    departmentName: p.department_id ? (deptNames.get(p.department_id) ?? null) : null,
    bpsGrade: p.bps_grade,
    vacancies: p.vacancies,
    interviewShortlistPerVacancy: p.interview_shortlist_per_vacancy,
    requiredQualification: p.required_qualification,
    requiredExperience: p.required_experience,
  }));

  return (
    <AdvertisementDetailView
      advertisement={{
        id: ad.id,
        title: ad.title,
        adNumber: ad.ad_number,
        adDate: ad.ad_date,
        openingDate: ad.opening_date,
        closingDate: ad.closing_date,
        interviewDate: ad.interview_date,
        location: ad.location,
        description: ad.description,
        instructions: ad.instructions,
        status: ad.status,
      }}
      positions={positionRows}
      criteriaByPosition={Object.fromEntries(criteriaByPosition)}
      docsByPosition={Object.fromEntries(docsByPosition)}
      departments={departments ?? []}
      canIssueAppointments={["principal", "college_admin", "admin"].includes(profile.role)}
    />
  );
}
