import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireApplicant } from "@/lib/auth/applicant-session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Applications" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  under_scrutiny: "secondary",
  documents_under_verification: "secondary",
  eligible: "default",
  ineligible: "destructive",
  shortlisted: "default",
  interview_scheduled: "default",
  interview_completed: "default",
  selected: "default",
  waiting_list: "secondary",
  not_selected: "destructive",
  appointment_issued: "default",
  rejected: "destructive",
  withdrawn: "outline",
};

export default async function ApplicantPortalHomePage() {
  const applicant = await requireApplicant();
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("recruitment_applications")
    .select("id, application_number, status, position_id, submitted_at")
    .eq("applicant_id", applicant.id)
    .order("created_at", { ascending: false });

  const positionIds = (applications ?? []).map((a) => a.position_id);
  const { data: positions } = positionIds.length
    ? await supabase.from("recruitment_positions").select("id, title, advertisement_id").in("id", positionIds)
    : { data: [] };
  const positionById = new Map((positions ?? []).map((p) => [p.id, p]));

  const adIds = [...new Set((positions ?? []).map((p) => p.advertisement_id))];
  const { data: ads } = adIds.length
    ? await supabase.from("recruitment_advertisements").select("id, title").in("id", adIds)
    : { data: [] };
  const adById = new Map((ads ?? []).map((a) => [a.id, a.title]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
      {!applications || applications.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          You haven&apos;t applied to anything yet. <Link href="/recruitment" className="text-blue-600 hover:underline">Browse open positions</Link>.
        </p>
      ) : (
        applications.map((app) => {
          const position = positionById.get(app.position_id);
          return (
            <Link key={app.id} href={`/recruitment/portal/applications/${app.id}`}>
              <Card className="transition hover:border-blue-400 hover:shadow-sm">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{position?.title ?? "Position"}</p>
                    <p className="text-sm text-gray-500">
                      {position && adById.get(position.advertisement_id)}
                      {app.application_number && ` · ${app.application_number}`}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[app.status] ?? "outline"} className="capitalize">
                    {app.status.replace(/_/g, " ")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })
      )}
    </div>
  );
}
