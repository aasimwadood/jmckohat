import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function HedOverviewPage() {
  await requireRole("hed_admin");
  const supabase = await createClient();

  const [{ count: directorateCount }, { count: jmcCount }, { data: collegeRows }, { data: collegeTypes }, { count: userCount }] =
    await Promise.all([
      supabase.from("directorates").select("*", { count: "exact", head: true }),
      supabase.from("jmcs").select("*", { count: "exact", head: true }),
      supabase.from("colleges").select("id, college_type_id"),
      supabase.from("college_types").select("id, code"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  const typeCodeById = new Map((collegeTypes ?? []).map((t) => [t.id, t.code]));
  const gpgcCount = (collegeRows ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GPGC").length;
  const gdcCount = (collegeRows ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GDC").length;

  const stats = [
    { label: "Directorates", value: directorateCount ?? 0 },
    { label: "JMCs", value: jmcCount ?? 0 },
    { label: "Colleges", value: collegeRows?.length ?? 0 },
    { label: "GPGCs", value: gpgcCount },
    { label: "GDCs", value: gdcCount },
    { label: "Total Users", value: userCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HED Overview</CardTitle>
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
