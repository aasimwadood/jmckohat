import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateExamScheduleDialog } from "./create-schedule-dialog";

export default async function DepartmentExamsPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: courses } = await supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId);
  const courseIds = (courses ?? []).map((c) => c.id);
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  const { data: exams } =
    courseIds.length > 0
      ? await supabase.from("exam_schedules").select("*").in("course_id", courseIds).order("exam_date")
      : { data: [] };

  const { data: activeSession } = await supabase.from("academic_sessions").select("id").eq("is_active", true).single();
  const { data: semesters } = activeSession
    ? await supabase.from("semesters").select("id, number").eq("academic_session_id", activeSession.id).order("number")
    : { data: [] };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Exam Schedule Management</CardTitle>
          <CreateExamScheduleDialog courses={courses ?? []} semesters={semesters ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(exams ?? []).map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{courseLabels.get(exam.course_id)}</TableCell>
                <TableCell>{new Date(exam.exam_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}
                </TableCell>
                <TableCell>{exam.room ?? "TBD"}</TableCell>
              </TableRow>
            ))}
            {(!exams || exams.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No exam schedules found for your department.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
