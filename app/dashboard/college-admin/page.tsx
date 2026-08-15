import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CollegeAdminOverviewPage() {
  const profile = await requireRole("college_admin");
  const supabase = await createClient();

  if (!profile.collegeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your college is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: college } = await supabase.from("colleges").select("*").eq("id", profile.collegeId).single();
  const [{ data: jmc }, { data: collegeType }, { data: departments }, { count: studentCount }, { count: facultyCount }] =
    await Promise.all([
      college
        ? supabase.from("jmcs").select("id, name, directorate_id").eq("id", college.jmc_id).single()
        : Promise.resolve({ data: null }),
      college
        ? supabase.from("college_types").select("name").eq("id", college.college_type_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("departments").select("id, name").eq("college_id", profile.collegeId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("college_id", profile.collegeId).eq("role", "student"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("college_id", profile.collegeId).eq("role", "faculty"),
    ]);
  const { data: directorate } = jmc
    ? await supabase.from("directorates").select("name").eq("id", jmc.directorate_id).single()
    : { data: null };

  const stats = [
    { label: "Departments", value: departments?.length ?? 0 },
    { label: "Students", value: studentCount ?? 0 },
    { label: "Faculty", value: facultyCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{college?.name ?? "College"}</CardTitle>
            {college && (
              <Badge variant={college.status === "active" ? "default" : "destructive"} className="capitalize">
                {college.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Code" value={college?.code ?? "—"} />
            <Field label="Type" value={collegeType?.name ?? "—"} />
            <Field label="JMC" value={jmc?.name ?? "—"} />
            <Field label="Directorate" value={directorate?.name ?? "—"} />
            <Field label="District" value={college?.district ?? "—"} />
            <Field label="Address" value={college?.address ?? "—"} />
            <Field label="Contact Number" value={college?.contact_number ?? "—"} />
            <Field label="Email" value={college?.email ?? "—"} />
          </div>
          <p className="mt-4 text-xs text-gray-500">
            This organizational record is managed by your JMC — contact them for changes to name, address, or contact details.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}
