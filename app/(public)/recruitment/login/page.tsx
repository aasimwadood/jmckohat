import type { Metadata } from "next";
import { ApplicantLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Applicant Login" };

export default async function RecruitmentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="mb-6 text-center text-gray-600">Sign in to apply for jobs and track your applications</p>
      <ApplicantLoginForm redirectTo={redirectTo} />
    </div>
  );
}
