import { Award, Users, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computeGpa } from "@/lib/utils/grading";

export default async function PrincipalOverviewPage() {
  const profile = await requireRole("principal");
  const supabase = await createClient();

  const [{ count: totalStudents }, { count: totalFaculty }, { data: results }, { data: fees }, { data: departments }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("student_status", "active"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "faculty"),
      supabase.from("results").select("total"),
      supabase.from("fee_payments").select("amount, status"),
      supabase.from("departments").select("id, name"),
    ]);

  const totalResults = results?.length ?? 0;
  const passCount = (results ?? []).filter((r) => r.total >= 50).length;
  const passRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;

  const totalFeeAmount = (fees ?? []).reduce((sum, f) => sum + f.amount, 0);
  const collectedAmount = (fees ?? []).filter((f) => f.status === "paid").reduce((sum, f) => sum + f.amount, 0);
  const collectionRate = totalFeeAmount > 0 ? Math.round((collectedAmount / totalFeeAmount) * 100) : 0;

  const kpis = [
    { label: "Overall Pass Rate", value: passRate, icon: Award, suffix: "%" },
    { label: "Total Students", value: totalStudents ?? 0, icon: Users, suffix: "" },
    { label: "Fee Collection Rate", value: collectionRate, icon: DollarSign, suffix: "%" },
    { label: "Total Faculty", value: totalFaculty ?? 0, icon: Activity, suffix: "" },
  ];

  const { data: studentsByDept } = await supabase.from("profiles").select("department_id").eq("role", "student").eq("student_status", "active");
  const { data: allResults } = await supabase.from("results").select("course_id, total");
  const { data: courses } = await supabase.from("courses").select("id, department_id");
  const courseDept = new Map((courses ?? []).map((c) => [c.id, c.department_id]));

  const studentCountByDept = new Map<string, number>();
  for (const s of studentsByDept ?? []) {
    if (!s.department_id) continue;
    studentCountByDept.set(s.department_id, (studentCountByDept.get(s.department_id) ?? 0) + 1);
  }
  const resultsByDept = new Map<string, number[]>();
  for (const r of allResults ?? []) {
    const deptId = courseDept.get(r.course_id);
    if (!deptId) continue;
    const list = resultsByDept.get(deptId) ?? [];
    list.push(r.total);
    resultsByDept.set(deptId, list);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Principal Dashboard</h1>
        <p className="text-gray-600">Institutional Performance Overview — {profile.fullName}</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {kpi.value}
                      {kpi.suffix}
                    </p>
                  </div>
                  <kpi.icon className="h-10 w-10 text-blue-500" />
                </div>
                {kpi.suffix === "%" && <Progress value={kpi.value} className="h-2" />}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Avg GPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(departments ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{studentCountByDept.get(d.id) ?? 0}</TableCell>
                    <TableCell>{computeGpa(resultsByDept.get(d.id) ?? []).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
