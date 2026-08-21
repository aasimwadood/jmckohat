import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { letterGrade } from "@/lib/utils/grading";
import { BreakdownCard } from "@/components/features/reports/breakdown-card";

export default async function DepartmentReportsPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: courses } = await supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId);
  const courseIds = (courses ?? []).map((c) => c.id);
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  const [{ data: results }, { data: attendanceRows }, { data: students }, { data: shifts }] = await Promise.all([
    courseIds.length > 0 ? supabase.from("results").select("course_id, total").in("course_id", courseIds) : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.from("attendance").select("course_id, status").in("course_id", courseIds) : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("id, shift_id").eq("department_id", profile.departmentId).eq("role", "student"),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);
  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));
  const shiftCounts = new Map<string, number>();
  for (const s of students ?? []) {
    const label = s.shift_id ? (shiftName.get(s.shift_id) ?? "—") : "Unassigned";
    shiftCounts.set(label, (shiftCounts.get(label) ?? 0) + 1);
  }

  const performanceByCourse = new Map<string, { count: number; sum: number }>();
  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const r of results ?? []) {
    const entry = performanceByCourse.get(r.course_id) ?? { count: 0, sum: 0 };
    entry.count += 1;
    entry.sum += r.total;
    performanceByCourse.set(r.course_id, entry);
    const grade = letterGrade(r.total);
    gradeDistribution[grade] = (gradeDistribution[grade] ?? 0) + 1;
  }

  const attendanceByCourse = new Map<string, { present: number; total: number }>();
  for (const a of attendanceRows ?? []) {
    const entry = attendanceByCourse.get(a.course_id) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (a.status === "present") entry.present += 1;
    attendanceByCourse.set(a.course_id, entry);
  }

  return (
    <div className="space-y-6">
      <BreakdownCard title="Students by Shift" counts={shiftCounts} />

      <Card>
        <CardHeader>
          <CardTitle>Student Performance by Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Results Recorded</TableHead>
                <TableHead>Average Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...performanceByCourse.entries()].map(([courseId, stats]) => (
                <TableRow key={courseId}>
                  <TableCell>{courseLabels.get(courseId)}</TableCell>
                  <TableCell>{stats.count}</TableCell>
                  <TableCell>{(stats.sum / stats.count).toFixed(1)}</TableCell>
                </TableRow>
              ))}
              {performanceByCourse.size === 0 && (
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

      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            {Object.entries(gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="rounded-lg border p-4">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500">Grade {grade}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary by Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...attendanceByCourse.entries()].map(([courseId, stats]) => (
                <TableRow key={courseId}>
                  <TableCell>{courseLabels.get(courseId)}</TableCell>
                  <TableCell>{stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%</TableCell>
                </TableRow>
              ))}
              {attendanceByCourse.size === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-gray-500">
                    No attendance data recorded yet.
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
