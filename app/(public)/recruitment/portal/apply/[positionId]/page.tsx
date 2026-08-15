import { notFound, redirect } from "next/navigation";
import { requireApplicant } from "@/lib/auth/applicant-session";
import { createClient } from "@/lib/supabase/server";
import { startApplicationAction, getApplicationDocumentsAction } from "@/lib/actions/recruitment-applicant";
import { ApplicationFormView } from "@/components/features/recruitment/application-form-view";

export default async function ApplyPage({ params }: { params: Promise<{ positionId: string }> }) {
  const { positionId } = await params;
  await requireApplicant();
  const supabase = await createClient();

  const { data: position } = await supabase
    .from("recruitment_positions")
    .select("id, title, advertisement_id")
    .eq("id", positionId)
    .single();
  if (!position) notFound();

  const { data: advertisement } = await supabase
    .from("recruitment_advertisements")
    .select("status")
    .eq("id", position.advertisement_id)
    .single();
  if (!advertisement || advertisement.status !== "applications_open") {
    redirect(`/recruitment/${position.advertisement_id}`);
  }

  const { applicationId, error } = await startApplicationAction(positionId);
  if (error || !applicationId) notFound();

  const [{ data: application }, { data: experience }, { data: requiredDocs }, documents] = await Promise.all([
    supabase
      .from("recruitment_applications")
      .select("id, status, qualification, degree, institution, subject, year_of_completion, marks_obtained, total_marks, percentage_cgpa")
      .eq("id", applicationId)
      .single(),
    supabase
      .from("recruitment_application_experience")
      .select("id, organization, position, start_date, end_date, is_current, description")
      .eq("application_id", applicationId),
    supabase.from("recruitment_required_documents").select("id, document_type, is_mandatory").eq("position_id", positionId),
    getApplicationDocumentsAction(applicationId),
  ]);

  if (!application) notFound();

  return (
    <ApplicationFormView
      applicationId={applicationId}
      positionTitle={position.title}
      status={application.status}
      academic={{
        qualification: application.qualification,
        degree: application.degree,
        institution: application.institution,
        subject: application.subject,
        yearOfCompletion: application.year_of_completion,
        marksObtained: application.marks_obtained,
        totalMarks: application.total_marks,
        percentageCgpa: application.percentage_cgpa,
      }}
      experience={(experience ?? []).map((e) => ({
        id: e.id,
        organization: e.organization,
        position: e.position,
        startDate: e.start_date,
        endDate: e.end_date,
        isCurrent: e.is_current,
        description: e.description,
      }))}
      requiredDocuments={(requiredDocs ?? []).map((d) => ({ id: d.id, documentType: d.document_type, isMandatory: d.is_mandatory }))}
      documents={documents}
    />
  );
}
