import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DesignationPicker, HeadOfDepartmentPicker } from "@/components/features/designations/designation-picker";
import { AddDesignationTypeForm } from "@/components/features/designations/add-designation-type-form";

export default async function PrincipalDesignationsPage() {
  const profile = await requireRole("principal");
  const supabase = await createClient();

  if (!profile.collegeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your college is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: types }, { data: assignments }, { data: departments }, { data: people }] = await Promise.all([
    supabase.from("designation_types").select("*").order("name"),
    supabase.from("designation_assignments").select("*").eq("college_id", profile.collegeId),
    supabase.from("departments").select("id, name, hod_profile_id").eq("college_id", profile.collegeId).order("name"),
    supabase.from("profiles").select("id, full_name, role").eq("college_id", profile.collegeId).order("full_name"),
  ]);

  const options = (people ?? []).map((p) => ({ id: p.id, name: p.full_name, role: p.role }));

  const collegeTypes = (types ?? []).filter((t) => t.scope === "college");
  const departmentTypes = (types ?? []).filter((t) => t.scope === "department");

  const collegeAssignment = (typeId: string) => (assignments ?? []).find((a) => a.designation_type_id === typeId && !a.department_id);
  const departmentAssignment = (typeId: string, departmentId: string) =>
    (assignments ?? []).find((a) => a.designation_type_id === typeId && a.department_id === departmentId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>College Designations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Designation</TableHead>
                  <TableHead>Current Holder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collegeTypes.map((t) => {
                  const current = collegeAssignment(t.id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <DesignationPicker
                          designationTypeId={t.id}
                          departmentId={null}
                          currentProfileId={current?.profile_id ?? null}
                          options={options}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {collegeTypes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-6 text-center text-gray-500">
                      No college-wide designations yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <AddDesignationTypeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department Designations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Head of Department</TableHead>
                  {departmentTypes.map((t) => (
                    <TableHead key={t.id}>{t.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(departments ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <HeadOfDepartmentPicker
                        departmentId={d.id}
                        currentProfileId={d.hod_profile_id}
                        options={options}
                      />
                    </TableCell>
                    {departmentTypes.map((t) => {
                      const current = departmentAssignment(t.id, d.id);
                      return (
                        <TableCell key={t.id}>
                          <DesignationPicker
                            designationTypeId={t.id}
                            departmentId={d.id}
                            currentProfileId={current?.profile_id ?? null}
                            options={options}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {(!departments || departments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={2 + departmentTypes.length} className="py-6 text-center text-gray-500">
                      No departments configured yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
