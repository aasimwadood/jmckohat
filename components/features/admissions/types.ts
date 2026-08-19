import type { AdmissionStatusEnum, MeritCategoryEnum } from "@/types/database.types";

export type AdmissionRow = {
  id: string;
  temporaryId: string;
  fullName: string;
  cnic: string | null;
  contactNumber: string | null;
  email: string | null;
  programName: string | null;
  meritCategory: MeritCategoryEnum;
  meritNumber: number | null;
  status: AdmissionStatusEnum;
  registrationNumber: string | null;
  feeReceiptNumber: string | null;
  totalFee: number;
  voucher: { id: string; voucherNumber: string; status: "unpaid" | "verified" | "canceled" } | null;
};

export type AdmissionViewRole = "department" | "faculty" | "administration" | "admin";
