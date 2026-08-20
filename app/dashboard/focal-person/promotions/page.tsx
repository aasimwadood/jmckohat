import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PromotionsView, type PromotionRow } from "@/components/features/promotions/promotions-view";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function FocalPersonPromotionsPage() {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, shift_id, group_id, section_id")
    .eq("department_id", profile.departmentId)
    .eq("role", "student");
  const studentIds = (students ?? []).map((s) => s.id);
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

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

  const [{ data: courses }, { data: shifts }, { data: groups }, { data: sections }] = await Promise.all([
    supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("groups").select("id, name").eq("department_id", profile.departmentId).order("sort_order"),
    supabase.from("sections").select("id, name, group_id").eq("department_id", profile.departmentId).order("sort_order"),
  ]);

  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const sectionName = new Map((sections ?? []).map((s) => [s.id, s.name]));

  const rows: PromotionRow[] = (promotions ?? []).map((p) => {
    const student = studentById.get(p.student_profile_id);
    return {
      id: p.id,
      studentName: student?.full_name ?? p.student_profile_id,
      cgpa: p.cgpa,
      academicStanding: p.academic_standing,
      maxCourses: p.max_courses,
      status: p.status,
      registeredCount: registeredCountByStudentSemester.get(`${p.student_profile_id}:${p.to_semester_id}`) ?? 0,
      shiftId: student?.shift_id ?? null,
      shiftName: student?.shift_id ? (shiftName.get(student.shift_id) ?? null) : null,
      groupSectionLabel: student?.group_id
        ? `${groupName.get(student.group_id) ?? "—"}${student.section_id ? ` — ${sectionName.get(student.section_id) ?? "—"}` : ""}`
        : null,
    };
  });

  return (
    <>
      <LiveRefresh table="promotions" />
      <PromotionsView
        role="focal_person_intermediate"
        departmentId={profile.departmentId}
        promotions={rows}
        availableCourses={courses ?? []}
        shifts={shifts ?? []}
        hasGroups={(groups ?? []).length > 0}
      />
    </>
  );
}
