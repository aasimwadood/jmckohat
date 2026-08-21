import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computeGpa } from "@/lib/utils/grading";

export default async function PrincipalDepartmentsPage() {
  await requireRole("principal");
  const supabase = await createClient();

  const [{ data: departments }, { data: students }, { data: faculty }, { data: courses }] = await Promise.all([
    supabase.from("departments").select("id, name, hod_profile_id"),
    supabase.from("profiles").select("id, department_id").eq("role", "student").eq("student_status", "active"),
    supabase.from("profiles").select("id, department_id").eq("role", "faculty"),
    supabase.from("courses").select("id, department_id"),
  ]);

  const hodIds = (departments ?? []).map((d) => d.hod_profile_id).filter((id): id is string => !!id);
  const { data: hods } =
    hodIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", hodIds) : { data: [] };
  const hodNames = new Map((hods ?? []).map((h) => [h.id, h.full_name]));

  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: results } =
    courseIds.length > 0 ? await supabase.from("results").select("course_id, total").in("course_id", courseIds) : { data: [] };
  const courseDept = new Map((courses ?? []).map((c) => [c.id, c.department_id]));
  const resultsByDept = new Map<string, number[]>();
  for (const r of results ?? []) {
    const deptId = courseDept.get(r.course_id);
    if (!deptId) continue;
    const list = resultsByDept.get(deptId) ?? [];
    list.push(r.total);
    resultsByDept.set(deptId, list);
  }

  const studentCount = new Map<string, number>();
  for (const s of students ?? []) {
    if (s.department_id) studentCount.set(s.department_id, (studentCount.get(s.department_id) ?? 0) + 1);
  }
  const facultyCount = new Map<string, number>();
  for (const f of faculty ?? []) {
    if (f.department_id) facultyCount.set(f.department_id, (facultyCount.get(f.department_id) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departmental Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>HoD</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Avg GPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(departments ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.hod_profile_id ? (hodNames.get(d.hod_profile_id) ?? "—") : "Not assigned"}</TableCell>
                <TableCell>{studentCount.get(d.id) ?? 0}</TableCell>
                <TableCell>{facultyCount.get(d.id) ?? 0}</TableCell>
                <TableCell>{computeGpa(resultsByDept.get(d.id) ?? []).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
