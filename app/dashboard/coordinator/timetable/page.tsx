import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DAY_NAMES } from "@/lib/constants/timetable";
import { CreateTimetableEntryDialog } from "@/app/dashboard/admin/timetable/create-entry-dialog";
import { DeleteEntryButton } from "@/app/dashboard/admin/timetable/delete-entry-button";

export default async function CoordinatorTimetablePage() {
  await requireRole("coordinator");
  const supabase = await createClient();

  const [{ data: entries }, { data: courses }, { data: departments }, { data: faculty }, { data: semesters }] =
    await Promise.all([
      supabase.from("timetable_entries").select("*").order("day_of_week"),
      supabase.from("courses").select("id, code, title, department_id"),
      supabase.from("departments").select("id, name"),
      supabase.from("profiles").select("id, full_name").eq("role", "faculty"),
      supabase.from("semesters").select("id, number, academic_session_id"),
    ]);

  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const facultyNames = new Map((faculty ?? []).map((f) => [f.id, f.full_name]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Timetable Management</CardTitle>
          <CreateTimetableEntryDialog
            courses={courses ?? []}
            departments={departments ?? []}
            faculty={faculty ?? []}
            semesters={semesters ?? []}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(entries ?? []).map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{departmentNames.get(entry.department_id)}</TableCell>
                <TableCell>{courseLabels.get(entry.course_id)}</TableCell>
                <TableCell>{entry.faculty_profile_id ? (facultyNames.get(entry.faculty_profile_id) ?? "—") : "—"}</TableCell>
                <TableCell>{DAY_NAMES[entry.day_of_week]}</TableCell>
                <TableCell>
                  {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                </TableCell>
                <TableCell>{entry.room ?? "TBD"}</TableCell>
                <TableCell>
                  <DeleteEntryButton entryId={entry.id} />
                </TableCell>
              </TableRow>
            ))}
            {(!entries || entries.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                  No timetable entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
