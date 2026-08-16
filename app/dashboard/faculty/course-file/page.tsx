import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CourseFileEditor } from "./course-file-editor";

export default async function FacultyCourseFilePage() {
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

  const [{ data: courses }, { data: reports }] = await Promise.all([
    supabase.from("courses").select("id, code, title").in("id", courseIds),
    supabase.from("course_file_reports").select("*").in("course_id", courseIds),
  ]);

  const semesterByCourse = new Map((assignments ?? []).map((a) => [a.course_id, a.semester_id]));
  const reportByCourse = new Map((reports ?? []).map((r) => [r.course_id, r]));

  const options = (courses ?? []).map((c) => ({
    id: c.id,
    label: `${c.code} - ${c.title}`,
    semesterId: semesterByCourse.get(c.id) ?? "",
    content: (reportByCourse.get(c.id)?.content ?? {}) as Record<string, string>,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course File Report</CardTitle>
      </CardHeader>
      <CardContent>
        <CourseFileEditor courses={options} />
      </CardContent>
    </Card>
  );
}
