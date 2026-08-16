import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DesignationPicker } from "@/components/features/designations/designation-picker";

export default async function DepartmentDesignationsPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: types }, { data: assignments }, { data: department }, { data: people }] = await Promise.all([
    supabase.from("designation_types").select("*").eq("scope", "department").order("name"),
    supabase.from("designation_assignments").select("*").eq("department_id", profile.departmentId),
    supabase.from("departments").select("name").eq("id", profile.departmentId).single(),
    supabase.from("profiles").select("id, full_name, role").eq("department_id", profile.departmentId).order("full_name"),
  ]);

  const options = (people ?? []).map((p) => ({ id: p.id, name: p.full_name, role: p.role }));
  const assignmentFor = (typeId: string) => (assignments ?? []).find((a) => a.designation_type_id === typeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{department?.name} — Department Designations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(types ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No department-level designations have been set up by your Principal yet.
          </p>
        ) : (
          (types ?? []).map((t) => {
            const current = assignmentFor(t.id);
            return (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <p className="font-medium text-gray-900">{t.name}</p>
                <div className="w-full sm:w-auto sm:min-w-[240px]">
                  <DesignationPicker
                    designationTypeId={t.id}
                    departmentId={profile.departmentId}
                    currentProfileId={current?.profile_id ?? null}
                    options={options}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
