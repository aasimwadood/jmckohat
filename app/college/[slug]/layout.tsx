import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCollegeBySlug } from "@/lib/services/colleges";

export default async function CollegeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();

  const profile = await getCurrentProfile();
  const basePath = `/college/${college.slug}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        isAuthenticated={!!profile}
        basePath={basePath}
        collegeName={college.name}
        collegeShortName={college.code}
        collegeAbbreviation={college.code}
        logoPath={college.logoPath ?? undefined}
      />
      <div className="flex-1">{children}</div>
      <Footer basePath={basePath} collegeId={college.id} collegeName={college.name} />
    </div>
  );
}
