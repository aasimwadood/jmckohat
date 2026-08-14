import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AttendanceDetailDialog } from "./attendance-detail-dialog";

export default async function StudentAttendancePage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("course_id, status, session_date")
    .eq("student_profile_id", profile.id)
    .order("session_date", { ascending: false });

  const courseIds = [...new Set((attendanceRows ?? []).map((r) => r.course_id))];
  const { data: courses } =
    courseIds.length > 0 ? await supabase.from("courses").select("id, code, title").in("id", courseIds) : { data: [] };
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  const byCourse = new Map<string, { present: number; total: number; details: { date: string; status: string }[] }>();
  for (const row of attendanceRows ?? []) {
    const entry = byCourse.get(row.course_id) ?? { present: 0, total: 0, details: [] };
    entry.total += 1;
    if (row.status === "present") entry.present += 1;
    entry.details.push({ date: row.session_date, status: row.status });
    byCourse.set(row.course_id, entry);
  }

  const summary = [...byCourse.entries()].map(([courseId, stats]) => ({
    courseId,
    courseLabel: courseLabels.get(courseId) ?? courseId,
    present: stats.present,
    total: stats.total,
    percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
    details: stats.details,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No attendance records yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((item) => (
                <TableRow key={item.courseId}>
                  <TableCell>{item.courseLabel}</TableCell>
                  <TableCell>{item.present}</TableCell>
                  <TableCell>{item.total}</TableCell>
                  <TableCell>
                    <Badge variant={item.percentage >= 75 ? "default" : "destructive"}>{item.percentage}%</Badge>
                  </TableCell>
                  <TableCell>
                    <AttendanceDetailDialog courseLabel={item.courseLabel} details={item.details} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
