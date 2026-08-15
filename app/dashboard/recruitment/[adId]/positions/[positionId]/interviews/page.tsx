import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InterviewsView } from "@/components/features/recruitment/interviews-view";
import type { InterviewRow, InterviewCandidateRow } from "@/components/features/recruitment/types";

export default async function PositionInterviewsPage({
  params,
}: {
  params: Promise<{ adId: string; positionId: string }>;
}) {
  const { adId, positionId } = await params;
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
  const supabase = await createClient();

  const { data: position } = await supabase
    .from("recruitment_positions")
    .select("id, title, advertisement_id")
    .eq("id", positionId)
    .single();
  if (!position || position.advertisement_id !== adId) notFound();

  const { data: advertisement } = await supabase
    .from("recruitment_advertisements")
    .select("college_id")
    .eq("id", adId)
    .single();
  if (!advertisement || advertisement.college_id !== profile.collegeId) notFound();

  const [{ data: interviews }, { data: applications }, { data: marks }] = await Promise.all([
    supabase
      .from("recruitment_interviews")
      .select("id, interview_date, interview_time, venue, panel_info")
      .eq("position_id", positionId)
      .order("interview_date", { ascending: true }),
    supabase
      .from("recruitment_applications")
      .select("id, application_number, status, applicant_id")
      .eq("position_id", positionId)
      .in("status", ["shortlisted", "interview_scheduled", "interview_completed"]),
    supabase.from("recruitment_interview_marks").select("application_id, interview_id, attendance, marks, finalized"),
  ]);

  const applicantIds = (applications ?? []).map((a) => a.applicant_id);
  const { data: applicants } = applicantIds.length
    ? await supabase.from("applicant_profiles").select("id, full_name").in("id", applicantIds)
    : { data: [] };
  const applicantById = new Map((applicants ?? []).map((a) => [a.id, a.full_name]));

  const interviewRows: InterviewRow[] = (interviews ?? []).map((i) => ({
    id: i.id,
    interviewDate: i.interview_date,
    interviewTime: i.interview_time,
    venue: i.venue,
    panelInfo: i.panel_info,
  }));

  const marksByKey = new Map((marks ?? []).map((m) => [`${m.application_id}:${m.interview_id}`, m]));

  const candidatesByInterview: Record<string, InterviewCandidateRow[]> = {};
  for (const interview of interviewRows) {
    candidatesByInterview[interview.id] = (applications ?? []).map((app) => {
      const mark = marksByKey.get(`${app.id}:${interview.id}`);
      return {
        applicationId: app.id,
        applicantName: applicantById.get(app.applicant_id) ?? "Unknown",
        applicationNumber: app.application_number,
        status: app.status,
        attendance: mark?.attendance ?? null,
        marks: mark?.marks ?? null,
        finalized: mark?.finalized ?? false,
      };
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href={`/dashboard/recruitment/${adId}`} className="text-sm text-blue-600 hover:underline">
        ← {position.title}
      </Link>
      <InterviewsView positionId={positionId} positionTitle={position.title} interviews={interviewRows} candidatesByInterview={candidatesByInterview} />
    </div>
  );
}
