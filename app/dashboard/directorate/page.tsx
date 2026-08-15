import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DirectorateOverviewPage() {
  const profile = await requireRole("directorate_admin");
  const supabase = await createClient();

  if (!profile.directorateId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your directorate is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: directorate } = await supabase.from("directorates").select("name").eq("id", profile.directorateId).single();
  const { data: jmcs } = await supabase.from("jmcs").select("id").eq("directorate_id", profile.directorateId);
  const jmcIds = (jmcs ?? []).map((j) => j.id);

  const [{ data: colleges }, { data: collegeTypes }] = await Promise.all([
    jmcIds.length > 0 ? supabase.from("colleges").select("id, college_type_id").in("jmc_id", jmcIds) : Promise.resolve({ data: [] }),
    supabase.from("college_types").select("id, code"),
  ]);
  const typeCodeById = new Map((collegeTypes ?? []).map((t) => [t.id, t.code]));
  const gpgcCount = (colleges ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GPGC").length;
  const gdcCount = (colleges ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GDC").length;

  const stats = [
    { label: "JMCs", value: jmcIds.length },
    { label: "Colleges", value: colleges?.length ?? 0 },
    { label: "GPGCs", value: gpgcCount },
    { label: "GDCs", value: gdcCount },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{directorate?.name ?? "Directorate"} — Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
