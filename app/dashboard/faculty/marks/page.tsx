import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MarksUploadForm } from "./marks-upload-form";

export default async function FacultyMarksPage() {
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

  const [{ data: courses }, { data: enrollments }, { data: results }] = await Promise.all([
    supabase.from("courses").select("id, code, title").in("id", courseIds),
    supabase.from("enrollments").select("student_profile_id, course_id").in("course_id", courseIds),
    supabase.from("results").select("*").in("course_id", courseIds),
  ]);

  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_profile_id))];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const semesterByCourse = new Map((assignments ?? []).map((a) => [a.course_id, a.semester_id]));
  const resultByKey = new Map((results ?? []).map((r) => [`${r.student_profile_id}:${r.course_id}`, r]));

  const coursesWithRosters = (courses ?? []).map((course) => ({
    id: course.id,
    label: `${course.code} - ${course.title}`,
    semesterId: semesterByCourse.get(course.id) ?? "",
    roster: (enrollments ?? [])
      .filter((e) => e.course_id === course.id)
      .map((e) => {
        const existing = resultByKey.get(`${e.student_profile_id}:${course.id}`);
        return {
          studentId: e.student_profile_id,
          studentName: studentNames.get(e.student_profile_id) ?? e.student_profile_id,
          quiz1: existing?.quiz1 ?? 0,
          quiz2: existing?.quiz2 ?? 0,
          midterm: existing?.midterm ?? 0,
          assignmentsScore: existing?.assignments_score ?? 0,
        };
      }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Student Marks</CardTitle>
      </CardHeader>
      <CardContent>
        <MarksUploadForm courses={coursesWithRosters} />
      </CardContent>
    </Card>
  );
}
