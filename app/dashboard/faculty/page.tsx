import { BookOpen, Users, FileText, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function FacultyOverviewPage() {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");
  const supabase = await createClient();

  const { data: department } = profile.departmentId
    ? await supabase.from("departments").select("name").eq("id", profile.departmentId).single()
    : { data: null };

  const { data: courseFaculty } = await supabase
    .from("course_faculty")
    .select("course_id")
    .eq("faculty_profile_id", profile.id);
  const courseIds = [...new Set((courseFaculty ?? []).map((c) => c.course_id))];

  const [{ data: courses }, { data: enrollments }, { data: assignments }, { data: submissions }, { data: todaySchedule }] =
    await Promise.all([
      courseIds.length > 0 ? supabase.from("courses").select("*").in("id", courseIds) : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase.from("enrollments").select("student_profile_id, course_id").in("course_id", courseIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0 ? supabase.from("assignments").select("*").in("course_id", courseIds) : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase.from("assignment_submissions").select("assignment_id")
        : Promise.resolve({ data: [] }),
      supabase
        .from("timetable_entries")
        .select("id")
        .eq("faculty_profile_id", profile.id)
        .eq("day_of_week", (new Date().getDay() + 6) % 7),
    ]);

  const totalStudents = new Set((enrollments ?? []).map((e) => e.student_profile_id)).size;
  const submissionCounts = new Map<string, number>();
  for (const s of submissions ?? []) {
    submissionCounts.set(s.assignment_id, (submissionCounts.get(s.assignment_id) ?? 0) + 1);
  }
  const now = new Date();
  const pendingAssignments = (assignments ?? []).filter((a) => new Date(a.due_date) >= now).length;
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  const studentsPerCourse = new Map<string, number>();
  for (const e of enrollments ?? []) {
    studentsPerCourse.set(e.course_id, (studentsPerCourse.get(e.course_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {profile.fullName}! {department ? `(${department.name} Department)` : ""}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <StatCard label="Total Courses" value={courseIds.length} icon={BookOpen} color="text-blue-500" />
          <StatCard label="Total Students" value={totalStudents} icon={Users} color="text-green-500" />
          <StatCard label="Upcoming Assignments" value={pendingAssignments} icon={FileText} color="text-orange-500" />
          <StatCard label="Today's Classes" value={todaySchedule?.length ?? 0} icon={Calendar} color="text-purple-500" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {(courses ?? []).length === 0 ? (
              <p className="py-6 text-center text-gray-500">No courses assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {(courses ?? []).map((course) => (
                  <div key={course.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-gray-900">{courseLabels.get(course.id)}</p>
                      <p className="text-sm text-gray-500">{studentsPerCourse.get(course.id) ?? 0} students</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(assignments ?? []).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <h4 className="text-gray-900">{assignment.title}</h4>
                    <p className="text-sm text-gray-600">
                      {courseLabels.get(assignment.course_id)} · Due {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mr-4 text-right">
                    <p className="text-gray-900">
                      {submissionCounts.get(assignment.id) ?? 0}/{studentsPerCourse.get(assignment.course_id) ?? 0}
                    </p>
                    <p className="text-sm text-gray-600">Submissions</p>
                  </div>
                </div>
              ))}
              {(assignments ?? []).length === 0 && <p className="py-6 text-center text-gray-500">No assignments yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof BookOpen;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <Icon className={`h-10 w-10 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
