import Link from "next/link";
import { requireApplicant } from "@/lib/auth/applicant-session";
import { applicantLogoutAction } from "@/lib/actions/recruitment-applicant";
import { Button } from "@/components/ui/button";

export default async function ApplicantPortalLayout({ children }: { children: React.ReactNode }) {
  const applicant = await requireApplicant();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/recruitment/portal" className="font-medium text-gray-900">
            My Applications
          </Link>
          <Link href="/recruitment/portal/profile" className="text-gray-600 hover:underline">
            Profile
          </Link>
          <Link href="/recruitment" className="text-gray-600 hover:underline">
            Browse Openings
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{applicant.fullName}</span>
          <form action={applicantLogoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
