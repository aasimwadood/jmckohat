import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function FocalPersonOverviewPage() {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: department } = await supabase.from("departments").select("name").eq("id", profile.departmentId).single();

  const [{ data: students }, { data: admissions }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("id").eq("department_id", profile.departmentId).eq("role", "student").eq("student_status", "active"),
    supabase.from("admissions").select("id, status").eq("department_id", profile.departmentId),
    supabase.from("groups").select("id").eq("department_id", profile.departmentId),
  ]);

  const pendingAdmissions = (admissions ?? []).filter((a) => a.status === "pending" || a.status === "fee_approved").length;

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: promotions } =
    studentIds.length > 0
      ? await supabase.from("promotions").select("id, status").in("student_profile_id", studentIds)
      : { data: [] };
  const awaitingFee = (promotions ?? []).filter((p) => p.status === "fee_pending").length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Intermediate Academic Dashboard</h1>
        <p className="text-gray-600">{department?.name ?? "Intermediate"}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Stat label="Total Students" value={(students ?? []).length} />
        <Stat label="Pending Admissions" value={pendingAdmissions} />
        <Stat label="Promotions Awaiting Fee" value={awaitingFee} />
        <Stat label="Groups Configured" value={(groups ?? []).length} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
