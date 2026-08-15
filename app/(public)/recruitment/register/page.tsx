import type { Metadata } from "next";
import { ApplicantRegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Applicant Registration" };

export default async function RecruitmentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="mb-6 text-center text-gray-600">Create an applicant account to apply for open positions</p>
      <ApplicantRegisterForm redirectTo={redirectTo} />
    </div>
  );
}
