import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BreakdownCard } from "@/components/features/reports/breakdown-card";

// New, not a mirror of app/dashboard/department/reports/page.tsx — that
// page includes attendance/grade-distribution content tied to concepts
// explicitly out of scope for this role. Scoped to what Focal Person's
// confirmed authority actually covers: admissions, promotions, fees, and a
// results-overview count.
export default async function FocalPersonReportsPage() {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: admissions }, { data: students }, { data: courses }, { data: shifts }, { data: groups }] = await Promise.all([
    supabase.from("admissions").select("status").eq("department_id", profile.departmentId),
    supabase.from("profiles").select("id, shift_id, group_id").eq("department_id", profile.departmentId).eq("role", "student").eq("student_status", "active"),
    supabase.from("courses").select("id").eq("department_id", profile.departmentId),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("groups").select("id, name").eq("department_id", profile.departmentId).order("sort_order"),
  ]);
  const studentIds = (students ?? []).map((s) => s.id);
  const courseIds = (courses ?? []).map((c) => c.id);
  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const { data: promotions } =
    studentIds.length > 0
      ? await supabase.from("promotions").select("id, status").in("student_profile_id", studentIds)
      : { data: [] };
  const promotionIds = (promotions ?? []).map((p) => p.id);

  const [{ data: vouchersByPromotion }, { count: resultsCount }] = await Promise.all([
    promotionIds.length > 0
      ? supabase.from("fee_vouchers").select("status").in("promotion_id", promotionIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from("results").select("id", { count: "exact", head: true }).in("course_id", courseIds)
      : Promise.resolve({ count: 0 }),
  ]);

  const countBy = <T extends string>(rows: { status: T }[] | null) => {
    const counts = new Map<string, number>();
    for (const r of rows ?? []) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return counts;
  };

  const admissionCounts = countBy(admissions);
  const promotionCounts = countBy(promotions);
  const voucherCounts = countBy(vouchersByPromotion);

  const shiftCounts = new Map<string, number>();
  const groupCounts = new Map<string, number>();
  for (const s of students ?? []) {
    const shiftLabel = s.shift_id ? (shiftName.get(s.shift_id) ?? "—") : "Unassigned";
    shiftCounts.set(shiftLabel, (shiftCounts.get(shiftLabel) ?? 0) + 1);
    const groupLabel = s.group_id ? (groupName.get(s.group_id) ?? "—") : "Unassigned";
    groupCounts.set(groupLabel, (groupCounts.get(groupLabel) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Intermediate Reports</h1>

      <BreakdownCard title="Admissions by Status" counts={admissionCounts} />
      <BreakdownCard title="Promotions by Status" counts={promotionCounts} />
      <BreakdownCard title="Fee Vouchers by Status" counts={voucherCounts} />
      <BreakdownCard title="Students by Shift" counts={shiftCounts} />
      {(groups ?? []).length > 0 && <BreakdownCard title="Students by Group" counts={groupCounts} />}

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-gray-900">{resultsCount ?? 0}</p>
          <p className="text-sm text-gray-500">marks entries submitted across your department&apos;s courses</p>
        </CardContent>
      </Card>
    </div>
  );
}
