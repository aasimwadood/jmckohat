"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/actions/audit";
import { getSignedUrl } from "@/lib/supabase/storage";
import type { ActionResult } from "@/lib/actions/auth";
import {
  createAdvertisementSchema,
  updateAdvertisementStatusSchema,
  createPositionSchema,
  createMeritCriterionSchema,
  createRequiredDocumentSchema,
  scrutinizeApplicationSchema,
  verifyDocumentSchema,
  enterMeritScoreSchema,
  shortlistCandidatesSchema,
  scheduleInterviewSchema,
  enterInterviewMarksSchema,
  issueAppointmentOrderSchema,
} from "@/lib/validations/recruitment";

const RECRUITMENT_ROLES = ["coordinator", "admin", "principal", "college_admin"] as const;
const APPOINTMENT_ROLES = ["principal", "college_admin", "admin"] as const;

// Advertisements -------------------------------------------------------------

export async function createAdvertisementAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = createAdvertisementSchema.safeParse({
    collegeId: formData.get("collegeId"),
    title: formData.get("title"),
    adNumber: formData.get("adNumber"),
    adDate: formData.get("adDate"),
    openingDate: formData.get("openingDate"),
    closingDate: formData.get("closingDate"),
    interviewDate: formData.get("interviewDate"),
    location: formData.get("location"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_advertisements").insert({
    college_id: parsed.data.collegeId,
    title: parsed.data.title,
    ad_number: parsed.data.adNumber || null,
    ad_date: parsed.data.adDate,
    opening_date: parsed.data.openingDate,
    closing_date: parsed.data.closingDate,
    interview_date: parsed.data.interviewDate || null,
    location: parsed.data.location || null,
    description: parsed.data.description || null,
    instructions: parsed.data.instructions || null,
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "create_recruitment_advertisement", "recruitment_advertisements", undefined, { title: parsed.data.title });
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function updateAdvertisementStatusAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = updateAdvertisementStatusSchema.safeParse({
    advertisementId: formData.get("advertisementId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recruitment_advertisements")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.advertisementId);
  if (error) return { error: error.message };

  await logAudit(profile.id, "update_recruitment_advertisement_status", "recruitment_advertisements", parsed.data.advertisementId, {
    status: parsed.data.status,
  });
  revalidatePath("/dashboard/recruitment", "layout");
  revalidatePath("/recruitment", "layout");
  return {};
}

// Positions / merit criteria / required documents ---------------------------

export async function createPositionAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = createPositionSchema.safeParse({
    advertisementId: formData.get("advertisementId"),
    title: formData.get("title"),
    departmentId: formData.get("departmentId"),
    bpsGrade: formData.get("bpsGrade"),
    vacancies: formData.get("vacancies"),
    requiredQualification: formData.get("requiredQualification"),
    requiredDegree: formData.get("requiredDegree"),
    requiredSubject: formData.get("requiredSubject"),
    requiredExperience: formData.get("requiredExperience"),
    ageLimit: formData.get("ageLimit"),
    genderRequirement: formData.get("genderRequirement"),
    domicileRequirement: formData.get("domicileRequirement"),
    quotaCategory: formData.get("quotaCategory"),
    otherCriteria: formData.get("otherCriteria"),
    interviewShortlistPerVacancy: formData.get("interviewShortlistPerVacancy") || 5,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_positions").insert({
    advertisement_id: parsed.data.advertisementId,
    title: parsed.data.title,
    department_id: parsed.data.departmentId || null,
    bps_grade: parsed.data.bpsGrade || null,
    vacancies: parsed.data.vacancies,
    required_qualification: parsed.data.requiredQualification || null,
    required_degree: parsed.data.requiredDegree || null,
    required_subject: parsed.data.requiredSubject || null,
    required_experience: parsed.data.requiredExperience || null,
    age_limit: parsed.data.ageLimit || null,
    gender_requirement: parsed.data.genderRequirement || null,
    domicile_requirement: parsed.data.domicileRequirement || null,
    quota_category: parsed.data.quotaCategory || null,
    other_criteria: parsed.data.otherCriteria || null,
    interview_shortlist_per_vacancy: parsed.data.interviewShortlistPerVacancy,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "create_recruitment_position", "recruitment_positions", undefined, { title: parsed.data.title });
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function createMeritCriterionAction(formData: FormData): Promise<ActionResult> {
  await requireRole(...RECRUITMENT_ROLES);

  const parsed = createMeritCriterionSchema.safeParse({
    positionId: formData.get("positionId"),
    name: formData.get("name"),
    maxScore: formData.get("maxScore"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_merit_criteria").insert({
    position_id: parsed.data.positionId,
    name: parsed.data.name,
    max_score: parsed.data.maxScore,
    sort_order: parsed.data.sortOrder,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function createRequiredDocumentAction(formData: FormData): Promise<ActionResult> {
  await requireRole(...RECRUITMENT_ROLES);

  const parsed = createRequiredDocumentSchema.safeParse({
    positionId: formData.get("positionId"),
    documentType: formData.get("documentType"),
    isMandatory: formData.get("isMandatory") ?? true,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_required_documents").insert({
    position_id: parsed.data.positionId,
    document_type: parsed.data.documentType,
    is_mandatory: parsed.data.isMandatory,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

// Scrutiny / document verification -------------------------------------------

export async function scrutinizeApplicationAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = scrutinizeApplicationSchema.safeParse({
    applicationId: formData.get("applicationId"),
    eligibilityStatus: formData.get("eligibilityStatus"),
    remarks: formData.get("remarks"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("scrutinize_recruitment_application", {
    p_application_id: parsed.data.applicationId,
    p_eligibility_status: parsed.data.eligibilityStatus,
    p_remarks: parsed.data.remarks || null,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "scrutinize_recruitment_application", "recruitment_applications", parsed.data.applicationId, {
    eligibilityStatus: parsed.data.eligibilityStatus,
  });
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function verifyDocumentAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = verifyDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    status: formData.get("status"),
    remarks: formData.get("remarks"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_recruitment_document", {
    p_document_id: parsed.data.documentId,
    p_status: parsed.data.status,
    p_remarks: parsed.data.remarks || null,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "verify_recruitment_document", "recruitment_application_documents", parsed.data.documentId, {
    status: parsed.data.status,
  });
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export type StaffApplicationDocumentRow = { id: string; documentType: string; status: string; remarks: string | null; url: string | null };

export async function getStaffApplicationDocumentsAction(applicationId: string): Promise<StaffApplicationDocumentRow[]> {
  await requireRole(...RECRUITMENT_ROLES);
  const supabase = await createClient();

  const { data } = await supabase
    .from("recruitment_application_documents")
    .select("id, document_type, file_path, verification_status, verification_remarks")
    .eq("application_id", applicationId);
  if (!data) return [];

  return Promise.all(
    data.map(async (doc) => ({
      id: doc.id,
      documentType: doc.document_type,
      status: doc.verification_status,
      remarks: doc.verification_remarks,
      url: await getSignedUrl("recruitment-documents", doc.file_path),
    })),
  );
}

// Merit scoring ---------------------------------------------------------------

export async function enterMeritScoreAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = enterMeritScoreSchema.safeParse({
    applicationId: formData.get("applicationId"),
    criterionId: formData.get("criterionId"),
    score: formData.get("score"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_merit_scores").upsert(
    {
      application_id: parsed.data.applicationId,
      criterion_id: parsed.data.criterionId,
      score: parsed.data.score,
      entered_by: profile.id,
    },
    { onConflict: "application_id,criterion_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

// Shortlisting ------------------------------------------------------------

export async function shortlistCandidatesAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = shortlistCandidatesSchema.safeParse({
    positionId: formData.get("positionId"),
    applicationIds: formData.getAll("applicationIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("shortlist_recruitment_candidates", {
    p_position_id: parsed.data.positionId,
    p_application_ids: parsed.data.applicationIds,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "shortlist_recruitment_candidates", "recruitment_positions", parsed.data.positionId, {
    count: parsed.data.applicationIds.length,
  });
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

// Interviews ------------------------------------------------------------------

export async function scheduleInterviewAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);

  const parsed = scheduleInterviewSchema.safeParse({
    positionId: formData.get("positionId"),
    interviewDate: formData.get("interviewDate"),
    interviewTime: formData.get("interviewTime"),
    venue: formData.get("venue"),
    panelInfo: formData.get("panelInfo"),
    instructions: formData.get("instructions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_recruitment_interview", {
    p_position_id: parsed.data.positionId,
    p_interview_date: parsed.data.interviewDate,
    p_interview_time: parsed.data.interviewTime || null,
    p_venue: parsed.data.venue || null,
    p_panel_info: parsed.data.panelInfo || null,
    p_instructions: parsed.data.instructions || null,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "schedule_recruitment_interview", "recruitment_positions", parsed.data.positionId);
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function enterInterviewMarksAction(formData: FormData): Promise<ActionResult> {
  await requireRole(...RECRUITMENT_ROLES);

  const parsed = enterInterviewMarksSchema.safeParse({
    applicationId: formData.get("applicationId"),
    interviewId: formData.get("interviewId"),
    attendance: formData.get("attendance"),
    marks: formData.get("marks") || undefined,
    remarks: formData.get("remarks"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("enter_interview_marks", {
    p_application_id: parsed.data.applicationId,
    p_interview_id: parsed.data.interviewId,
    p_attendance: parsed.data.attendance,
    p_marks: parsed.data.marks ?? null,
    p_remarks: parsed.data.remarks || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function finalizeInterviewMarksAction(applicationId: string, interviewId: string): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_interview_marks", {
    p_application_id: applicationId,
    p_interview_id: interviewId,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "finalize_interview_marks", "recruitment_applications", applicationId);
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function reopenInterviewMarksAction(applicationId: string, interviewId: string): Promise<ActionResult> {
  const profile = await requireRole("admin", "principal");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_interview_marks", {
    p_application_id: applicationId,
    p_interview_id: interviewId,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "reopen_interview_marks", "recruitment_applications", applicationId);
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

// Final selection + appointment orders ----------------------------------------

export async function finalizeRecruitmentSelectionAction(positionId: string): Promise<ActionResult> {
  const profile = await requireRole(...RECRUITMENT_ROLES);
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_recruitment_selection", { p_position_id: positionId });
  if (error) return { error: error.message };

  await logAudit(profile.id, "finalize_recruitment_selection", "recruitment_positions", positionId);
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}

export async function issueAppointmentOrderAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole(...APPOINTMENT_ROLES);

  const parsed = issueAppointmentOrderSchema.safeParse({
    applicationId: formData.get("applicationId"),
    terms: formData.get("terms"),
    reportingInstructions: formData.get("reportingInstructions"),
    joiningDeadline: formData.get("joiningDeadline"),
    officerName: formData.get("officerName"),
    officerTitle: formData.get("officerTitle"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_appointment_order", {
    p_application_id: parsed.data.applicationId,
    p_terms: parsed.data.terms || null,
    p_reporting_instructions: parsed.data.reportingInstructions || null,
    p_joining_deadline: parsed.data.joiningDeadline || null,
    p_officer_name: parsed.data.officerName,
    p_officer_title: parsed.data.officerTitle,
  });
  if (error) return { error: error.message };

  await logAudit(profile.id, "issue_appointment_order", "recruitment_applications", parsed.data.applicationId);
  revalidatePath("/dashboard/recruitment", "layout");
  return {};
}
