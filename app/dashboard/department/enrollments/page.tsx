import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentsView } from "@/components/features/enrollments/enrollments-view";

export default async function DepartmentEnrollmentsPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: courses }, { data: semesters }, { data: students }] = await Promise.all([
    supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId).order("code"),
    supabase.from("semesters").select("id, number, academic_session_id").order("number"),
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("department_id", profile.departmentId)
      .eq("role", "student")
      .order("full_name"),
  ]);

  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: enrollments } = courseIds.length
    ? await supabase
        .from("enrollments")
        .select("id, student_profile_id, course_id, semester_id, status")
        .in("course_id", courseIds)
    : { data: [] };

  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} — ${c.title}`]));

  const enrollmentRows = (enrollments ?? []).map((e) => ({
    id: e.id,
    studentName: studentNames.get(e.student_profile_id) ?? "Unknown",
    courseLabel: courseLabels.get(e.course_id) ?? "Unknown",
    semesterNumber: (semesters ?? []).find((s) => s.id === e.semester_id)?.number ?? 0,
    status: e.status,
  }));

  return (
    <EnrollmentsView
      courses={courses ?? []}
      semesters={(semesters ?? []).map((s) => ({ id: s.id, label: `Semester ${s.number}` }))}
      students={(students ?? []).map((s) => ({ id: s.id, name: s.full_name, username: s.username }))}
      enrollments={enrollmentRows}
    />
  );
}
