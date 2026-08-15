"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApplicant } from "@/lib/auth/applicant-session";
import {
  applicantRegisterSchema,
  applicantLoginSchema,
  applicantProfileSchema,
  applicationAcademicSchema,
  applicationExperienceSchema,
  uploadApplicationDocumentSchema,
} from "@/lib/validations/recruitment";
import type { ActionResult } from "@/lib/actions/auth";
import { getSignedUrl } from "@/lib/supabase/storage";

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];

/**
 * Applicant sign-up. Deliberately does NOT go through the public
 * registerAction()/signUp() path — that path lets the on_auth_user_created
 * trigger create a default `student` profile. Instead this mirrors
 * provisionStaffAction()'s two-step admin-client pattern, but sets
 * account_type: 'applicant' in user_metadata so the trigger (see
 * supabase/migrations/0038_recruitment_functions.sql) skips the profiles
 * insert entirely, then creates the applicant's own applicant_profiles row.
 */
export async function applicantRegisterAction(redirectTo: string | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = applicantRegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    fatherName: formData.get("fatherName"),
    cnic: formData.get("cnic"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { fullName, fatherName, cnic, email, phone, password } = parsed.data;
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: "applicant", full_name: fullName },
  });
  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create account" };
  }

  const { error: profileError } = await admin.from("applicant_profiles").insert({
    id: created.user.id,
    full_name: fullName,
    father_name: fatherName || null,
    cnic: cnic || null,
    email,
    phone: phone || null,
  });
  if (profileError) {
    return { error: profileError.message };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "Account created — please sign in." };
  }

  redirect(redirectTo && redirectTo.startsWith("/recruitment/portal") ? redirectTo : "/recruitment/portal");
}

export async function applicantLoginAction(redirectTo: string | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = applicantLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Invalid email or password" };
  }

  const { data: applicant } = await supabase
    .from("applicant_profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!applicant) {
    await supabase.auth.signOut();
    return { error: "This login is for job applicants only." };
  }

  redirect(redirectTo && redirectTo.startsWith("/recruitment/portal") ? redirectTo : "/recruitment/portal");
}

export async function applicantLogoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/recruitment/login");
}

export async function updateApplicantProfileAction(formData: FormData): Promise<ActionResult> {
  const applicant = await requireApplicant();

  const parsed = applicantProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    fatherName: formData.get("fatherName"),
    cnic: formData.get("cnic"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    domicile: formData.get("domicile"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("applicant_profiles")
    .update({
      full_name: parsed.data.fullName,
      father_name: parsed.data.fatherName || null,
      cnic: parsed.data.cnic || null,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      domicile: parsed.data.domicile || null,
    })
    .eq("id", applicant.id);
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export async function startApplicationAction(positionId: string): Promise<{ error?: string; applicationId?: string }> {
  const applicant = await requireApplicant();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("recruitment_applications")
    .select("id")
    .eq("position_id", positionId)
    .eq("applicant_id", applicant.id)
    .maybeSingle();
  if (existing) return { applicationId: existing.id };

  const { data, error } = await supabase
    .from("recruitment_applications")
    .insert({ position_id: positionId, applicant_id: applicant.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  return { applicationId: data.id };
}

export async function updateApplicationAcademicAction(formData: FormData): Promise<ActionResult> {
  await requireApplicant();

  const parsed = applicationAcademicSchema.safeParse({
    applicationId: formData.get("applicationId"),
    qualification: formData.get("qualification"),
    degree: formData.get("degree"),
    institution: formData.get("institution"),
    subject: formData.get("subject"),
    yearOfCompletion: formData.get("yearOfCompletion") || undefined,
    marksObtained: formData.get("marksObtained") || undefined,
    totalMarks: formData.get("totalMarks") || undefined,
    percentageCgpa: formData.get("percentageCgpa") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recruitment_applications")
    .update({
      qualification: parsed.data.qualification || null,
      degree: parsed.data.degree || null,
      institution: parsed.data.institution || null,
      subject: parsed.data.subject || null,
      year_of_completion: parsed.data.yearOfCompletion ?? null,
      marks_obtained: parsed.data.marksObtained ?? null,
      total_marks: parsed.data.totalMarks ?? null,
      percentage_cgpa: parsed.data.percentageCgpa ?? null,
    })
    .eq("id", parsed.data.applicationId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export async function addApplicationExperienceAction(formData: FormData): Promise<ActionResult> {
  await requireApplicant();

  const parsed = applicationExperienceSchema.safeParse({
    applicationId: formData.get("applicationId"),
    organization: formData.get("organization"),
    position: formData.get("position"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    isCurrent: formData.get("isCurrent") === "on" || formData.get("isCurrent") === "true",
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_application_experience").insert({
    application_id: parsed.data.applicationId,
    organization: parsed.data.organization,
    position: parsed.data.position,
    start_date: parsed.data.startDate || null,
    end_date: parsed.data.endDate || null,
    is_current: parsed.data.isCurrent,
    description: parsed.data.description || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export async function deleteApplicationExperienceAction(experienceId: string): Promise<ActionResult> {
  await requireApplicant();
  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_application_experience").delete().eq("id", experienceId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export type ApplicationDocumentRow = { id: string; documentType: string; uploadedAt: string; status: string; url: string | null };

export async function getApplicationDocumentsAction(applicationId: string): Promise<ApplicationDocumentRow[]> {
  await requireApplicant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("recruitment_application_documents")
    .select("id, document_type, file_path, uploaded_at, verification_status")
    .eq("application_id", applicationId)
    .order("uploaded_at", { ascending: false });
  if (!data) return [];

  return Promise.all(
    data.map(async (doc) => ({
      id: doc.id,
      documentType: doc.document_type,
      uploadedAt: doc.uploaded_at,
      status: doc.verification_status,
      url: await getSignedUrl("recruitment-documents", doc.file_path),
    })),
  );
}

export async function uploadApplicationDocumentAction(formData: FormData): Promise<ActionResult> {
  await requireApplicant();

  const parsed = uploadApplicationDocumentSchema.safeParse({
    applicationId: formData.get("applicationId"),
    documentType: formData.get("documentType"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select a file to upload" };
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) return { error: "File is too large (max 10MB)" };
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) return { error: "Accepted formats: PDF, PNG, JPEG" };

  const supabase = await createClient();
  const path = `${parsed.data.applicationId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("recruitment-documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const { error } = await supabase.from("recruitment_application_documents").insert({
    application_id: parsed.data.applicationId,
    document_type: parsed.data.documentType,
    file_path: path,
  });
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export async function deleteApplicationDocumentAction(documentId: string): Promise<ActionResult> {
  await requireApplicant();
  const supabase = await createClient();
  const { error } = await supabase.from("recruitment_application_documents").delete().eq("id", documentId);
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export async function submitApplicationAction(applicationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_recruitment_application", { p_application_id: applicationId });
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}

export async function withdrawApplicationAction(applicationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_recruitment_application", { p_application_id: applicationId });
  if (error) return { error: error.message };

  revalidatePath("/recruitment/portal", "layout");
  return {};
}
