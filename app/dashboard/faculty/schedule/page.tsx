import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DAY_NAMES } from "@/lib/constants/timetable";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function FacultySchedulePage() {
  const profile = await requireRole("faculty");
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("faculty_profile_id", profile.id)
    .order("day_of_week");

  const courseIds = [...new Set((entries ?? []).map((e) => e.course_id))];
  const { data: courses } =
    courseIds.length > 0 ? await supabase.from("courses").select("id, code, title").in("id", courseIds) : { data: [] };
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, { code: c.code, title: c.title }]));

  return (
    <Card>
      <LiveRefresh table="timetable_entries" filter={`faculty_profile_id=eq.${profile.id}`} />
      <CardHeader>
        <CardTitle>Class Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(entries ?? []).map((entry) => {
              const course = courseLabels.get(entry.course_id);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{DAY_NAMES[entry.day_of_week]}</TableCell>
                  <TableCell>
                    {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{course?.code}</p>
                    <p className="text-xs text-gray-500">{course?.title}</p>
                  </TableCell>
                  <TableCell>{entry.room ?? "TBD"}</TableCell>
                </TableRow>
              );
            })}
            {(!entries || entries.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                  <Calendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p>No classes scheduled for you.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
