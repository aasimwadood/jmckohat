import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function FacultyCoursesPage() {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");
  const supabase = await createClient();

  const { data: courseFaculty } = await supabase
    .from("course_faculty")
    .select("course_id")
    .eq("faculty_profile_id", profile.id);
  const courseIds = [...new Set((courseFaculty ?? []).map((c) => c.course_id))];

  if (courseIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">No courses assigned yet.</CardContent>
      </Card>
    );
  }

  const [{ data: courses }, { data: enrollments }, { data: results }, { data: attendanceRows }] = await Promise.all([
    supabase.from("courses").select("*").in("id", courseIds),
    supabase.from("enrollments").select("student_profile_id, course_id").in("course_id", courseIds),
    supabase.from("results").select("student_profile_id, course_id, total").in("course_id", courseIds),
    supabase.from("attendance").select("student_profile_id, course_id, status").in("course_id", courseIds),
  ]);

  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_profile_id))];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  const resultsByKey = new Map((results ?? []).map((r) => [`${r.student_profile_id}:${r.course_id}`, r.total]));
  const attendanceByKey = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows ?? []) {
    const key = `${row.student_profile_id}:${row.course_id}`;
    const entry = attendanceByKey.get(key) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (row.status === "present") entry.present += 1;
    attendanceByKey.set(key, entry);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Courses - Detailed View</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={courses?.[0]?.id}>
          <TabsList className="mb-4 flex h-auto flex-wrap">
            {(courses ?? []).map((course) => (
              <TabsTrigger key={course.id} value={course.id}>
                {course.code}
              </TabsTrigger>
            ))}
          </TabsList>
          {(courses ?? []).map((course) => {
            const courseStudents = (enrollments ?? []).filter((e) => e.course_id === course.id);
            return (
              <TabsContent key={course.id} value={course.id}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoBox label="Course Code" value={course.code} />
                    <InfoBox label="Total Students" value={String(courseStudents.length)} />
                    <InfoBox label="Credits" value={String(course.credits)} />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="mb-4 text-gray-900">Student List</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Marks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseStudents.map((e) => {
                          const attendance = attendanceByKey.get(`${e.student_profile_id}:${course.id}`);
                          const percentage =
                            attendance && attendance.total > 0
                              ? Math.round((attendance.present / attendance.total) * 100)
                              : null;
                          const total = resultsByKey.get(`${e.student_profile_id}:${course.id}`);
                          return (
                            <TableRow key={e.student_profile_id}>
                              <TableCell>{studentNames.get(e.student_profile_id) ?? e.student_profile_id}</TableCell>
                              <TableCell>{percentage !== null ? `${percentage}%` : "—"}</TableCell>
                              <TableCell>{total ?? "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                        {courseStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-gray-500">
                              No students enrolled yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-blue-50 p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}
