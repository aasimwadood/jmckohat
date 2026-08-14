import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { findSchedulingConflicts } from "@/lib/services/scheduling-conflicts";
import { DAY_NAMES } from "@/lib/constants/timetable";

export default async function CoordinatorConflictsPage() {
  await requireRole("coordinator");
  const supabase = await createClient();

  const { data: entries } = await supabase.from("timetable_entries").select("*");
  const conflicts = findSchedulingConflicts(entries ?? []);

  const courseIds = [...new Set(conflicts.flatMap((c) => c.entries.map((e) => e.course_id)))];
  const facultyIds = [...new Set(conflicts.flatMap((c) => c.entries.map((e) => e.faculty_profile_id).filter((id): id is string => !!id)))];
  const [{ data: courses }, { data: faculty }] = await Promise.all([
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    facultyIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", facultyIds) : Promise.resolve({ data: [] }),
  ]);
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const facultyNames = new Map((faculty ?? []).map((f) => [f.id, f.full_name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling Conflicts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conflicts.length === 0 && <p className="py-8 text-center text-gray-500">No scheduling conflicts detected.</p>}
        {conflicts.map((conflict, idx) => (
          <div key={idx} className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="destructive" className="capitalize">
                {conflict.type} conflict
              </Badge>
              <span className="text-sm text-gray-600">{DAY_NAMES[conflict.dayOfWeek]}</span>
            </div>
            <p className="text-sm text-gray-700">
              {conflict.type === "faculty"
                ? `${facultyNames.get(conflict.key) ?? conflict.key} is double-booked: `
                : `Room ${conflict.key} is double-booked: `}
              {conflict.entries.map((e) => `${courseLabels.get(e.course_id) ?? e.course_id} (${e.start_time.slice(0, 5)}-${e.end_time.slice(0, 5)})`).join(" and ")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
