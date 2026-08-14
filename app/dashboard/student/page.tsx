import { Bell, CheckCircle, TrendingUp, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computeGpa } from "@/lib/utils/grading";

export default async function StudentOverviewPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const [{ data: notifications }, { data: enrollments }, { data: results }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    profile.currentSemesterId
      ? supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_profile_id", profile.id)
          .eq("semester_id", profile.currentSemesterId)
      : Promise.resolve({ data: [] as { course_id: string }[] }),
    supabase.from("results").select("course_id, total").eq("student_profile_id", profile.id),
  ]);

  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const { data: courseRows } =
    courseIds.length > 0 ? await supabase.from("courses").select("id, code, title").in("id", courseIds) : { data: [] };
  const courseNames = new Map((courseRows ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  const { data: attendanceRows } =
    courseIds.length > 0
      ? await supabase.from("attendance").select("course_id, status").eq("student_profile_id", profile.id).in("course_id", courseIds)
      : { data: [] };

  const attendanceByCourse = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows ?? []) {
    const entry = attendanceByCourse.get(row.course_id) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (row.status === "present") entry.present += 1;
    attendanceByCourse.set(row.course_id, entry);
  }

  const totalPresent = [...attendanceByCourse.values()].reduce((sum, v) => sum + v.present, 0);
  const totalSessions = [...attendanceByCourse.values()].reduce((sum, v) => sum + v.total, 0);
  const overallAttendance = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

  const cgpa = computeGpa((results ?? []).map((r) => r.total));

  const { data: assignmentRows } =
    courseIds.length > 0
      ? await supabase.from("assignments").select("id, due_date").in("course_id", courseIds)
      : { data: [] };
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("assignment_id")
    .eq("student_profile_id", profile.id);
  const submittedIds = new Set((submissions ?? []).map((s) => s.assignment_id));
  const pendingAssignments = (assignmentRows ?? []).filter((a) => !submittedIds.has(a.id)).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile.fullName}!</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications && notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-gray-900">{notif.title}</p>
                      {notif.body && <p className="text-sm text-gray-600">{notif.body}</p>}
                      <p className="text-sm text-gray-500">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-gray-500">No recent notifications</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overall Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{overallAttendance}%</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <Progress value={overallAttendance} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current GPA</p>
                  <p className="text-2xl font-bold text-gray-900">{cgpa.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-blue-500" />
              </div>
              <p className="text-sm text-gray-500">Based on {(results ?? []).length} finalized result(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingAssignments}</p>
                </div>
                <FileText className="h-10 w-10 text-orange-500" />
              </div>
              <p className="text-sm text-gray-500">Across current semester courses</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceByCourse.size === 0 ? (
              <p className="py-4 text-center text-gray-500">No attendance records yet.</p>
            ) : (
              <div className="space-y-4">
                {[...attendanceByCourse.entries()].map(([courseId, stats]) => {
                  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                  return (
                    <div key={courseId}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-gray-900">{courseNames.get(courseId) ?? courseId}</span>
                        <span className={`font-semibold ${percentage >= 75 ? "text-green-600" : "text-red-600"}`}>
                          {stats.present}/{stats.total} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className={percentage < 75 ? "h-2 [&>div]:bg-red-500" : "h-2"} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
