import type {
  RecruitmentAdStatusEnum,
  RecruitmentApplicationStatusEnum,
  RecruitmentDocumentStatusEnum,
  RecruitmentEligibilityStatusEnum,
} from "@/types/database.types";

export type AdvertisementRow = {
  id: string;
  title: string;
  adNumber: string | null;
  status: RecruitmentAdStatusEnum;
  openingDate: string;
  closingDate: string;
  positionsCount: number;
};

export type RecruitmentStats = {
  totalAdvertisements: number;
  activeAdvertisements: number;
  totalApplications: number;
  eligible: number;
  shortlisted: number;
  selected: number;
  appointmentsIssued: number;
};

export type PositionRow = {
  id: string;
  title: string;
  departmentName: string | null;
  bpsGrade: string | null;
  vacancies: number;
  interviewShortlistPerVacancy: number;
  requiredQualification: string | null;
  requiredExperience: string | null;
};

export type MeritCriterionRow = { id: string; name: string; maxScore: number };
export type RequiredDocumentRow = { id: string; documentType: string; isMandatory: boolean };

export type ApplicationRow = {
  id: string;
  applicationNumber: string | null;
  applicantName: string;
  applicantEmail: string;
  status: RecruitmentApplicationStatusEnum;
  eligibilityStatus: RecruitmentEligibilityStatusEnum;
  scrutinyRemarks: string | null;
  qualification: string | null;
  submittedAt: string | null;
  meritTotal: number | null;
  finalRank: number | null;
};

export type RequiredDocStatus = { documentType: string; isMandatory: boolean; status: RecruitmentDocumentStatusEnum | "missing" };

export type InterviewRow = {
  id: string;
  interviewDate: string;
  interviewTime: string | null;
  venue: string | null;
  panelInfo: string | null;
};

export type InterviewCandidateRow = {
  applicationId: string;
  applicantName: string;
  applicationNumber: string | null;
  status: RecruitmentApplicationStatusEnum;
  attendance: "present" | "absent" | null;
  marks: number | null;
  finalized: boolean;
};
