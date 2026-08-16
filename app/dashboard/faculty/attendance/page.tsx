import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MarkAttendanceForm } from "./mark-attendance-form";

export default async function FacultyAttendancePage() {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("course_faculty")
    .select("course_id, semester_id")
    .eq("faculty_profile_id", profile.id);

  const courseIds = [...new Set((assignments ?? []).map((a) => a.course_id))];
  if (courseIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">No courses assigned yet.</CardContent>
      </Card>
    );
  }

  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from("courses").select("id, code, title").in("id", courseIds),
    supabase.from("enrollments").select("student_profile_id, course_id").in("course_id", courseIds),
  ]);

  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_profile_id))];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const semesterByCourse = new Map((assignments ?? []).map((a) => [a.course_id, a.semester_id]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={courses?.[0]?.id}>
          <TabsList className="flex h-auto flex-wrap">
            {(courses ?? []).map((course) => (
              <TabsTrigger key={course.id} value={course.id}>
                {course.code}
              </TabsTrigger>
            ))}
          </TabsList>
          {(courses ?? []).map((course) => {
            const roster = (enrollments ?? [])
              .filter((e) => e.course_id === course.id)
              .map((e) => ({ id: e.student_profile_id, name: studentNames.get(e.student_profile_id) ?? e.student_profile_id }));
            return (
              <TabsContent key={course.id} value={course.id} className="mt-4">
                <MarkAttendanceForm
                  courseId={course.id}
                  semesterId={semesterByCourse.get(course.id) ?? ""}
                  roster={roster}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
