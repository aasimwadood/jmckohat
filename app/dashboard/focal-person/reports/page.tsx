import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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

  const [{ data: admissions }, { data: students }, { data: courses }] = await Promise.all([
    supabase.from("admissions").select("status").eq("department_id", profile.departmentId),
    supabase.from("profiles").select("id").eq("department_id", profile.departmentId).eq("role", "student"),
    supabase.from("courses").select("id").eq("department_id", profile.departmentId),
  ]);
  const studentIds = (students ?? []).map((s) => s.id);
  const courseIds = (courses ?? []).map((c) => c.id);

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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Intermediate Reports</h1>

      <BreakdownCard title="Admissions by Status" counts={admissionCounts} />
      <BreakdownCard title="Promotions by Status" counts={promotionCounts} />
      <BreakdownCard title="Fee Vouchers by Status" counts={voucherCounts} />

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

function BreakdownCard({ title, counts }: { title: string; counts: Map<string, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {counts.size === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...counts.entries()].map(([status, count]) => (
              <div key={status}>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-sm capitalize text-gray-500">{status.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
