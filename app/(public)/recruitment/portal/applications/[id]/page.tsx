import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireApplicant } from "@/lib/auth/applicant-session";
import { createClient } from "@/lib/supabase/server";
import { getApplicationDocumentsAction } from "@/lib/actions/recruitment-applicant";
import { WithdrawButton } from "@/components/features/recruitment/withdraw-button";

const STATUS_STEPS = [
  "submitted",
  "under_scrutiny",
  "eligible",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "selected",
  "appointment_issued",
];

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = await requireApplicant();
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("recruitment_applications")
    .select("id, application_number, status, position_id, applicant_id, submitted_at, scrutiny_remarks, rejection_reason")
    .eq("id", id)
    .single();

  if (!application || application.applicant_id !== applicant.id) notFound();

  const { data: position } = await supabase
    .from("recruitment_positions")
    .select("id, title, advertisement_id")
    .eq("id", application.position_id)
    .single();

  const { data: advertisement } = position
    ? await supabase.from("recruitment_advertisements").select("title").eq("id", position.advertisement_id).single()
    : { data: null };

  const documents = await getApplicationDocumentsAction(application.id);

  const { data: interviews } = await supabase
    .from("recruitment_interviews")
    .select("id, interview_date, interview_time, venue, panel_info, instructions")
    .eq("position_id", application.position_id)
    .order("interview_date", { ascending: true });

  const { data: order } = await supabase
    .from("recruitment_appointment_orders")
    .select("order_number")
    .eq("application_id", application.id)
    .maybeSingle();

  const stepIndex = STATUS_STEPS.indexOf(application.status);
  const canWithdraw = !["selected", "waiting_list", "not_selected", "appointment_issued", "rejected", "withdrawn"].includes(
    application.status,
  );

  return (
    <div className="space-y-6">
      <Link href="/recruitment/portal" className="text-sm text-blue-600 hover:underline">
        ← My Applications
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{position?.title}</CardTitle>
              <p className="text-sm text-gray-500">
                {advertisement?.title}
                {application.application_number && ` · ${application.application_number}`}
              </p>
            </div>
            <Badge className="shrink-0 capitalize">{application.status.replace(/_/g, " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stepIndex >= 0 && (
            <div className="flex flex-wrap gap-1">
              {STATUS_STEPS.map((step, i) => (
                <span
                  key={step}
                  className={`rounded px-2 py-0.5 text-xs capitalize ${
                    i <= stepIndex ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
          {application.status === "ineligible" && application.scrutiny_remarks && (
            <p className="flex items-start gap-2 rounded bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {application.scrutiny_remarks}
            </p>
          )}
          {canWithdraw && <WithdrawButton applicationId={application.id} />}
        </CardContent>
      </Card>

      {(interviews ?? []).length > 0 &&
        ["interview_scheduled", "interview_completed", "selected", "waiting_list", "not_selected", "appointment_issued"].includes(
          application.status,
        ) && (
          <Card>
            <CardHeader>
              <CardTitle>Interview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(interviews ?? []).map((iv) => (
                <div key={iv.id} className="rounded border p-3">
                  <p className="font-medium">
                    {new Date(iv.interview_date).toLocaleDateString()} {iv.interview_time && `· ${iv.interview_time}`}
                  </p>
                  {iv.venue && <p className="text-gray-600">Venue: {iv.venue}</p>}
                  {iv.instructions && <p className="text-gray-500">{iv.instructions}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      {order && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm">
              Appointment order <span className="font-medium">{order.order_number}</span> has been issued.
            </p>
            <Button asChild size="sm">
              <Link href={`/recruitment/portal/applications/${application.id}/appointment-order`}>View / Print</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <span>{d.documentType}</span>
                  <Badge variant="outline" className="capitalize">
                    {d.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
