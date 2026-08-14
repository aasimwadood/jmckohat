import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminReportsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: departments }, { data: students }, { data: admissions }] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("profiles").select("department_id").eq("role", "student"),
    supabase.from("admissions").select("status"),
  ]);

  const studentsByDept = new Map<string, number>();
  for (const s of students ?? []) {
    if (!s.department_id) continue;
    studentsByDept.set(s.department_id, (studentsByDept.get(s.department_id) ?? 0) + 1);
  }

  const admissionsByStatus = new Map<string, number>();
  for (const a of admissions ?? []) {
    admissionsByStatus.set(a.status, (admissionsByStatus.get(a.status) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Students by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(departments ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{studentsByDept.get(d.id) ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admissions Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {["pending", "fee_approved", "admitted", "canceled"].map((status) => (
              <div key={status} className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{admissionsByStatus.get(status) ?? 0}</p>
                <p className="text-sm text-gray-500 capitalize">{status.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
