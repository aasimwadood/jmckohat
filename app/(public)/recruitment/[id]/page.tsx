import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentApplicant } from "@/lib/auth/applicant-session";

export const metadata: Metadata = { title: "Recruitment Advertisement" };

export default async function RecruitmentAdvertisementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ad } = await supabase
    .from("recruitment_advertisements")
    .select("id, title, ad_number, ad_date, opening_date, closing_date, interview_date, location, description, instructions, status, college_id")
    .eq("id", id)
    .single();

  if (!ad || ad.status === "draft") notFound();

  const { data: college } = await supabase.from("colleges").select("name").eq("id", ad.college_id).single();

  const { data: positions } = await supabase
    .from("recruitment_positions")
    .select("id, title, bps_grade, vacancies, required_qualification, required_degree, required_subject, required_experience, age_limit, gender_requirement, domicile_requirement, quota_category")
    .eq("advertisement_id", id);

  const positionIds = (positions ?? []).map((p) => p.id);
  const { data: requiredDocs } = positionIds.length
    ? await supabase.from("recruitment_required_documents").select("position_id, document_type, is_mandatory").in("position_id", positionIds)
    : { data: [] };

  const docsByPosition = new Map<string, { documentType: string; isMandatory: boolean }[]>();
  (requiredDocs ?? []).forEach((d) => {
    const list = docsByPosition.get(d.position_id) ?? [];
    list.push({ documentType: d.document_type, isMandatory: d.is_mandatory });
    docsByPosition.set(d.position_id, list);
  });

  const applicant = await getCurrentApplicant();
  const applyingOpen = ad.status === "applications_open";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/recruitment" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← All Openings
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1">{ad.title}</h1>
          <p className="text-gray-500">
            {college?.name}
            {ad.ad_number && ` · Ad #${ad.ad_number}`}
          </p>
        </div>
        <Badge variant={applyingOpen ? "default" : "secondary"} className="capitalize">
          {ad.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="space-y-2 py-5 text-sm text-gray-700">
          <p>
            <span className="font-medium">Applications:</span> {new Date(ad.opening_date).toLocaleDateString()} –{" "}
            {new Date(ad.closing_date).toLocaleDateString()}
          </p>
          {ad.interview_date && (
            <p>
              <span className="font-medium">Interview Date:</span> {new Date(ad.interview_date).toLocaleDateString()}
            </p>
          )}
          {ad.location && (
            <p>
              <span className="font-medium">Location:</span> {ad.location}
            </p>
          )}
          {ad.description && <p className="pt-2">{ad.description}</p>}
          {ad.instructions && <p className="pt-2 text-gray-500">{ad.instructions}</p>}
        </CardContent>
      </Card>

      <h2 className="mb-3">Positions</h2>
      <div className="space-y-4">
        {(positions ?? []).map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {p.title} {p.bps_grade && <span className="text-sm font-normal text-gray-500">({p.bps_grade})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Vacancies:</span> {p.vacancies}
              </p>
              {p.required_qualification && (
                <p>
                  <span className="font-medium">Qualification:</span> {p.required_qualification}
                </p>
              )}
              {p.required_degree && (
                <p>
                  <span className="font-medium">Degree:</span> {p.required_degree}
                  {p.required_subject && ` in ${p.required_subject}`}
                </p>
              )}
              {p.required_experience && (
                <p>
                  <span className="font-medium">Experience:</span> {p.required_experience}
                </p>
              )}
              {(p.age_limit || p.gender_requirement || p.domicile_requirement || p.quota_category) && (
                <p className="text-gray-500">
                  {[p.age_limit && `Age: ${p.age_limit}`, p.gender_requirement, p.domicile_requirement, p.quota_category]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {docsByPosition.get(p.id) && (
                <div>
                  <p className="font-medium">Required Documents:</p>
                  <ul className="ml-4 list-disc text-gray-600">
                    {docsByPosition.get(p.id)!.map((d) => (
                      <li key={d.documentType}>
                        {d.documentType}
                        {d.isMandatory ? "" : " (optional)"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                {applyingOpen ? (
                  <Button asChild>
                    <Link href={applicant ? `/recruitment/portal/apply/${p.id}` : `/recruitment/login?redirectTo=/recruitment/portal/apply/${p.id}`}>
                      Apply Online
                    </Link>
                  </Button>
                ) : (
                  <Button disabled variant="outline">
                    Applications Closed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
