import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function JmcOverviewPage() {
  const profile = await requireRole("jmc_admin");
  const supabase = await createClient();

  if (!profile.jmcId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your JMC is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: jmc }, { data: colleges }, { data: collegeTypes }] = await Promise.all([
    supabase.from("jmcs").select("name, district").eq("id", profile.jmcId).single(),
    supabase.from("colleges").select("id, college_type_id").eq("jmc_id", profile.jmcId),
    supabase.from("college_types").select("id, code"),
  ]);
  const typeCodeById = new Map((collegeTypes ?? []).map((t) => [t.id, t.code]));
  const gpgcCount = (colleges ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GPGC").length;
  const gdcCount = (colleges ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GDC").length;

  const stats = [
    { label: "Colleges", value: colleges?.length ?? 0 },
    { label: "GPGCs", value: gpgcCount },
    { label: "GDCs", value: gdcCount },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {jmc?.name ?? "JMC"} — Overview
            {jmc?.district && <span className="ml-2 text-sm font-normal text-gray-500">{jmc.district}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
