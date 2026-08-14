import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TimetableGrid, type TimetableEntryView } from "@/components/features/timetable-grid";

export default async function StudentTimetablePage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  if (!profile.currentSemesterId) {
    return <TimetableGrid entries={[]} />;
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_profile_id", profile.id)
    .eq("semester_id", profile.currentSemesterId);
  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  if (courseIds.length === 0) {
    return <TimetableGrid entries={[]} />;
  }

  const [{ data: entries }, { data: courses }] = await Promise.all([
    supabase
      .from("timetable_entries")
      .select("id, course_id, faculty_profile_id, day_of_week, start_time, end_time, room, group_name")
      .in("course_id", courseIds),
    supabase.from("courses").select("id, code, title").in("id", courseIds),
  ]);

  const facultyIds = [...new Set((entries ?? []).map((e) => e.faculty_profile_id).filter((id): id is string => !!id))];
  const { data: faculty } =
    facultyIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", facultyIds) : { data: [] };

  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const facultyNames = new Map((faculty ?? []).map((f) => [f.id, f.full_name]));

  const view: TimetableEntryView[] = (entries ?? []).map((e) => ({
    id: e.id,
    dayOfWeek: e.day_of_week,
    startTime: e.start_time,
    endTime: e.end_time,
    room: e.room,
    groupName: e.group_name,
    courseLabel: courseLabels.get(e.course_id) ?? e.course_id,
    facultyName: e.faculty_profile_id ? (facultyNames.get(e.faculty_profile_id) ?? null) : null,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">My Timetable</h1>
      <TimetableGrid entries={view} />
    </div>
  );
}
