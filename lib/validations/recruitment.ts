import { z } from "zod";

// Applicant auth ------------------------------------------------------------
// Applicants log in with email directly (no username system — they're
// external candidates, not part of the staff/student username scheme).

export const applicantRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(200),
    fatherName: z.string().trim().max(200).optional().or(z.literal("")),
    cnic: z.string().trim().max(20).optional().or(z.literal("")),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ApplicantRegisterInput = z.infer<typeof applicantRegisterSchema>;

export const applicantLoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type ApplicantLoginInput = z.infer<typeof applicantLoginSchema>;

export const applicantProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(200),
  fatherName: z.string().trim().max(200).optional().or(z.literal("")),
  cnic: z.string().trim().max(20).optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  gender: z.string().trim().max(30).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  domicile: z.string().trim().max(100).optional().or(z.literal("")),
});
export type ApplicantProfileInput = z.infer<typeof applicantProfileSchema>;

// Staff: advertisement + positions ------------------------------------------

export const createAdvertisementSchema = z.object({
  collegeId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(300),
  adNumber: z.string().trim().max(100).optional().or(z.literal("")),
  adDate: z.string().min(1, "Advertisement date is required"),
  openingDate: z.string().min(1, "Opening date is required"),
  closingDate: z.string().min(1, "Closing date is required"),
  interviewDate: z.string().optional().or(z.literal("")),
  location: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  instructions: z.string().trim().max(5000).optional().or(z.literal("")),
});
export type CreateAdvertisementInput = z.infer<typeof createAdvertisementSchema>;

export const RECRUITMENT_AD_STATUSES = [
  "draft",
  "published",
  "applications_open",
  "applications_closed",
  "under_scrutiny",
  "scrutiny_completed",
  "merit_generated",
  "candidates_shortlisted",
  "interviews_scheduled",
  "interviews_completed",
  "final_merit_prepared",
  "selection_finalized",
  "appointment_orders_issued",
  "completed",
  "cancelled",
] as const;

export const updateAdvertisementStatusSchema = z.object({
  advertisementId: z.string().uuid(),
  status: z.enum(RECRUITMENT_AD_STATUSES),
});
export type UpdateAdvertisementStatusInput = z.infer<typeof updateAdvertisementStatusSchema>;

export const createPositionSchema = z.object({
  advertisementId: z.string().uuid(),
  title: z.string().trim().min(1, "Position title is required").max(200),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  bpsGrade: z.string().trim().max(30).optional().or(z.literal("")),
  vacancies: z.coerce.number().int().min(1, "At least one vacancy is required"),
  requiredQualification: z.string().trim().max(500).optional().or(z.literal("")),
  requiredDegree: z.string().trim().max(300).optional().or(z.literal("")),
  requiredSubject: z.string().trim().max(300).optional().or(z.literal("")),
  requiredExperience: z.string().trim().max(500).optional().or(z.literal("")),
  ageLimit: z.string().trim().max(100).optional().or(z.literal("")),
  genderRequirement: z.string().trim().max(50).optional().or(z.literal("")),
  domicileRequirement: z.string().trim().max(100).optional().or(z.literal("")),
  quotaCategory: z.string().trim().max(100).optional().or(z.literal("")),
  otherCriteria: z.string().trim().max(1000).optional().or(z.literal("")),
  interviewShortlistPerVacancy: z.coerce.number().int().min(1).default(5),
});
export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const createMeritCriterionSchema = z.object({
  positionId: z.string().uuid(),
  name: z.string().trim().min(1, "Criterion name is required").max(100),
  maxScore: z.coerce.number().positive("Max score must be greater than zero"),
  sortOrder: z.coerce.number().int().default(0),
});
export type CreateMeritCriterionInput = z.infer<typeof createMeritCriterionSchema>;

export const createRequiredDocumentSchema = z.object({
  positionId: z.string().uuid(),
  documentType: z.string().trim().min(1, "Document type is required").max(150),
  isMandatory: z.coerce.boolean().default(true),
});
export type CreateRequiredDocumentInput = z.infer<typeof createRequiredDocumentSchema>;

// Applicant: application form -----------------------------------------------

export const applicationAcademicSchema = z.object({
  applicationId: z.string().uuid(),
  qualification: z.string().trim().max(300).optional().or(z.literal("")),
  degree: z.string().trim().max(300).optional().or(z.literal("")),
  institution: z.string().trim().max(300).optional().or(z.literal("")),
  subject: z.string().trim().max(300).optional().or(z.literal("")),
  yearOfCompletion: z.coerce.number().int().optional(),
  marksObtained: z.coerce.number().optional(),
  totalMarks: z.coerce.number().optional(),
  percentageCgpa: z.coerce.number().optional(),
});
export type ApplicationAcademicInput = z.infer<typeof applicationAcademicSchema>;

export const applicationExperienceSchema = z.object({
  applicationId: z.string().uuid(),
  organization: z.string().trim().min(1, "Organization is required").max(300),
  position: z.string().trim().min(1, "Position is required").max(200),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  isCurrent: z.coerce.boolean().default(false),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ApplicationExperienceInput = z.infer<typeof applicationExperienceSchema>;

export const uploadApplicationDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  documentType: z.string().trim().min(1, "Document type is required").max(150),
});
export type UploadApplicationDocumentInput = z.infer<typeof uploadApplicationDocumentSchema>;

// Staff: scrutiny, merit, shortlisting, interviews, selection ---------------

export const scrutinizeApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  eligibilityStatus: z.enum(["pending", "eligible", "ineligible"]),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ScrutinizeApplicationInput = z.infer<typeof scrutinizeApplicationSchema>;

export const verifyDocumentSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(["pending", "verified", "rejected", "not_required"]),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type VerifyDocumentInput = z.infer<typeof verifyDocumentSchema>;

export const enterMeritScoreSchema = z.object({
  applicationId: z.string().uuid(),
  criterionId: z.string().uuid(),
  score: z.coerce.number().min(0, "Score cannot be negative"),
});
export type EnterMeritScoreInput = z.infer<typeof enterMeritScoreSchema>;

export const shortlistCandidatesSchema = z.object({
  positionId: z.string().uuid(),
  applicationIds: z.array(z.string().uuid()).min(1, "Select at least one candidate"),
});
export type ShortlistCandidatesInput = z.infer<typeof shortlistCandidatesSchema>;

export const scheduleInterviewSchema = z.object({
  positionId: z.string().uuid(),
  interviewDate: z.string().min(1, "Interview date is required"),
  interviewTime: z.string().trim().max(50).optional().or(z.literal("")),
  venue: z.string().trim().max(300).optional().or(z.literal("")),
  panelInfo: z.string().trim().max(1000).optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const enterInterviewMarksSchema = z.object({
  applicationId: z.string().uuid(),
  interviewId: z.string().uuid(),
  attendance: z.enum(["present", "absent"]),
  marks: z.coerce.number().optional(),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type EnterInterviewMarksInput = z.infer<typeof enterInterviewMarksSchema>;

export const issueAppointmentOrderSchema = z.object({
  applicationId: z.string().uuid(),
  terms: z.string().trim().max(3000).optional().or(z.literal("")),
  reportingInstructions: z.string().trim().max(1000).optional().or(z.literal("")),
  joiningDeadline: z.string().optional().or(z.literal("")),
  officerName: z.string().trim().min(1, "Authorized officer name is required").max(200),
  officerTitle: z.string().trim().min(1, "Authorized officer title is required").max(200),
});
export type IssueAppointmentOrderInput = z.infer<typeof issueAppointmentOrderSchema>;
