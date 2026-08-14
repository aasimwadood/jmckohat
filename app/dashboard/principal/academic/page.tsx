import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PrincipalAcademicPage() {
  await requireRole("principal");
  const supabase = await createClient();

  const [{ data: departments }, { data: courses }, { data: results }, { data: semesters }] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("courses").select("id, department_id"),
    supabase.from("results").select("course_id, semester_id, total"),
    supabase.from("semesters").select("id, number"),
  ]);

  const courseDept = new Map((courses ?? []).map((c) => [c.id, c.department_id]));
  const semesterNumbers = new Map((semesters ?? []).map((s) => [s.id, s.number]));

  const passByDept = new Map<string, { pass: number; total: number }>();
  const bySemester = new Map<number, { pass: number; total: number }>();
  for (const r of results ?? []) {
    const deptId = courseDept.get(r.course_id);
    if (deptId) {
      const entry = passByDept.get(deptId) ?? { pass: 0, total: 0 };
      entry.total += 1;
      if (r.total >= 50) entry.pass += 1;
      passByDept.set(deptId, entry);
    }
    const semNum = semesterNumbers.get(r.semester_id);
    if (semNum) {
      const entry = bySemester.get(semNum) ?? { pass: 0, total: 0 };
      entry.total += 1;
      if (r.total >= 50) entry.pass += 1;
      bySemester.set(semNum, entry);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pass Rate by Department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(departments ?? []).map((d) => {
            const stats = passByDept.get(d.id);
            const rate = stats && stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0;
            return (
              <div key={d.id}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-900">{d.name}</span>
                  <span className="font-semibold text-gray-900">{rate}%</span>
                </div>
                <Progress value={rate} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semester-wise Pass Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semester</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Pass Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bySemester.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([num, stats]) => (
                  <TableRow key={num}>
                    <TableCell>Semester {num}</TableCell>
                    <TableCell>{stats.total}</TableCell>
                    <TableCell>{Math.round((stats.pass / stats.total) * 100)}%</TableCell>
                  </TableRow>
                ))}
              {bySemester.size === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-gray-500">
                    No results recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
