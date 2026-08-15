import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RecruitmentDashboardView } from "@/components/features/recruitment/recruitment-dashboard-view";
import type { AdvertisementRow } from "@/components/features/recruitment/types";

export default async function RecruitmentDashboardPage() {
  const profile = await requireRole("coordinator", "admin", "principal", "college_admin");
  const supabase = await createClient();

  if (!profile.collegeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Your account isn&apos;t linked to a college yet — contact your administrator.
        </CardContent>
      </Card>
    );
  }

  const { data: ads } = await supabase
    .from("recruitment_advertisements")
    .select("id, title, ad_number, status, opening_date, closing_date, created_at")
    .eq("college_id", profile.collegeId)
    .order("created_at", { ascending: false });

  const adIds = (ads ?? []).map((a) => a.id);

  const { data: positions } = adIds.length
    ? await supabase.from("recruitment_positions").select("id, advertisement_id").in("advertisement_id", adIds)
    : { data: [] };

  const positionIds = (positions ?? []).map((p) => p.id);
  const positionsByAd = new Map<string, number>();
  (positions ?? []).forEach((p) => {
    positionsByAd.set(p.advertisement_id, (positionsByAd.get(p.advertisement_id) ?? 0) + 1);
  });

  const { data: applications } = positionIds.length
    ? await supabase.from("recruitment_applications").select("id, status").in("position_id", positionIds)
    : { data: [] };

  const rows: AdvertisementRow[] = (ads ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    adNumber: a.ad_number,
    status: a.status,
    openingDate: a.opening_date,
    closingDate: a.closing_date,
    positionsCount: positionsByAd.get(a.id) ?? 0,
  }));

  const apps = applications ?? [];
  const stats = {
    totalAdvertisements: ads?.length ?? 0,
    activeAdvertisements: (ads ?? []).filter((a) => !["draft", "completed", "cancelled"].includes(a.status)).length,
    totalApplications: apps.length,
    eligible: apps.filter((a) => a.status === "eligible").length,
    shortlisted: apps.filter((a) => a.status === "shortlisted" || a.status === "interview_scheduled").length,
    selected: apps.filter((a) => a.status === "selected").length,
    appointmentsIssued: apps.filter((a) => a.status === "appointment_issued").length,
  };

  return <RecruitmentDashboardView collegeId={profile.collegeId} advertisements={rows} stats={stats} />;
}
