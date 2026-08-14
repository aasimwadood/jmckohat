import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ControllerOverviewPage() {
  const profile = await requireRole("controller");
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const [{ count: upcomingExams }, { count: transcriptRequests }, { count: resultQueries }, { data: schedules }] =
    await Promise.all([
      supabase.from("exam_schedules").select("id", { count: "exact", head: true }).gte("exam_date", today),
      supabase.from("transcript_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("result_queries").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("exam_schedules").select("*").gte("exam_date", today).order("exam_date").limit(10),
    ]);

  const courseIds = [...new Set((schedules ?? []).map((s) => s.course_id))];
  const { data: courses } =
    courseIds.length > 0 ? await supabase.from("courses").select("id, code, title, department_id").in("id", courseIds) : { data: [] };
  const departmentIds = [...new Set((courses ?? []).map((c) => c.department_id))];
  const { data: departments } =
    departmentIds.length > 0 ? await supabase.from("departments").select("id, name").in("id", departmentIds) : { data: [] };
  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const courseInfo = new Map((courses ?? []).map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Controller of Examination</h1>
        <p className="text-gray-600">Welcome back, {profile.fullName}</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Stat label="Upcoming Exams" value={upcomingExams ?? 0} />
          <Stat label="Pending Transcript Requests" value={transcriptRequests ?? 0} />
          <Stat label="Pending Result Queries" value={resultQueries ?? 0} />
          <Stat label="Scheduled This Period" value={(schedules ?? []).length} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Schedule Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(schedules ?? []).map((s) => {
                  const course = courseInfo.get(s.course_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{course ? departmentNames.get(course.department_id) : "—"}</TableCell>
                      <TableCell>{course?.code ?? "—"}</TableCell>
                      <TableCell>{new Date(s.exam_date).toLocaleDateString()}</TableCell>
                      <TableCell>{s.start_time.slice(0, 5)}</TableCell>
                    </TableRow>
                  );
                })}
                {(!schedules || schedules.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-gray-500">
                      No upcoming exams scheduled.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
