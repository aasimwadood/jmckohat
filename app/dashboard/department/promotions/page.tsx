import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PromotionsView, type PromotionRow } from "@/components/features/promotions/promotions-view";

export default async function DepartmentPromotionsPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: students } = await supabase.from("profiles").select("id, full_name").eq("department_id", profile.departmentId).eq("role", "student");
  const studentIds = (students ?? []).map((s) => s.id);
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  const { data: promotions } =
    studentIds.length > 0
      ? await supabase.from("promotions").select("*").in("student_profile_id", studentIds).order("created_at", { ascending: false })
      : { data: [] };

  const promotionIds = (promotions ?? []).map((p) => p.id);
  const { data: enrollmentCounts } =
    promotionIds.length > 0
      ? await supabase.from("enrollments").select("student_profile_id, semester_id").in("student_profile_id", studentIds)
      : { data: [] };

  const registeredCountByStudentSemester = new Map<string, number>();
  for (const e of enrollmentCounts ?? []) {
    const key = `${e.student_profile_id}:${e.semester_id}`;
    registeredCountByStudentSemester.set(key, (registeredCountByStudentSemester.get(key) ?? 0) + 1);
  }

  const { data: courses } = await supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId);

  const rows: PromotionRow[] = (promotions ?? []).map((p) => ({
    id: p.id,
    studentName: studentNames.get(p.student_profile_id) ?? p.student_profile_id,
    cgpa: p.cgpa,
    academicStanding: p.academic_standing,
    maxCourses: p.max_courses,
    status: p.status,
    registeredCount: registeredCountByStudentSemester.get(`${p.student_profile_id}:${p.to_semester_id}`) ?? 0,
  }));

  return (
    <PromotionsView role="department" departmentId={profile.departmentId} promotions={rows} availableCourses={courses ?? []} />
  );
}
