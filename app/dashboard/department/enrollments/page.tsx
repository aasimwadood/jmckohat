import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentsView } from "@/components/features/enrollments/enrollments-view";
import type { Database } from "@/types/database.types";

// The project's PostgREST max-rows setting caps any single response at
// 1000 regardless of the range requested — a real department can now
// exceed that (1580 enrollments for Computer Science alone), so this pages
// through in fixed-size chunks until a short page signals the end.
const PAGE_SIZE = 1000;

async function fetchAllEnrollments(supabase: SupabaseClient<Database>, courseIds: string[]) {
  const rows: { id: string; student_profile_id: string; course_id: string; semester_id: string; status: string }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await supabase
      .from("enrollments")
      .select("id, student_profile_id, course_id, semester_id, status")
      .in("course_id", courseIds)
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

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

  const [{ data: courses }, { data: semesters }, { data: students }, { data: shifts }] = await Promise.all([
    supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId).order("code"),
    supabase.from("semesters").select("id, number, academic_session_id").order("number"),
    supabase
      .from("profiles")
      .select("id, full_name, username, batch, current_semester_id, shift_id")
      .eq("department_id", profile.departmentId)
      .eq("role", "student")
      .order("full_name"),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);

  const courseIds = (courses ?? []).map((c) => c.id);
  const enrollments = courseIds.length ? await fetchAllEnrollments(supabase, courseIds) : [];

  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} — ${c.title}`]));

  const enrollmentRows = enrollments.map((e) => ({
    id: e.id,
    studentName: studentNames.get(e.student_profile_id) ?? "Unknown",
    courseLabel: courseLabels.get(e.course_id) ?? "Unknown",
    semesterNumber: (semesters ?? []).find((s) => s.id === e.semester_id)?.number ?? 0,
    status: e.status,
  }));

  const semesterNumberById = new Map((semesters ?? []).map((s) => [s.id, s.number]));

  return (
    <EnrollmentsView
      courses={courses ?? []}
      students={(students ?? []).map((s) => ({
        id: s.id,
        name: s.full_name,
        username: s.username,
        batch: s.batch,
        semesterNumber: s.current_semester_id ? (semesterNumberById.get(s.current_semester_id) ?? null) : null,
        shiftId: s.shift_id,
      }))}
      enrollments={enrollmentRows}
      shifts={shifts ?? []}
    />
  );
}
