import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateExamScheduleDialog } from "./create-schedule-dialog";

export default async function ControllerSchedulesPage() {
  await requireRole("controller");
  const supabase = await createClient();

  const [{ data: exams }, { data: courses }, { data: departments }, { data: semesters }] = await Promise.all([
    supabase.from("exam_schedules").select("*").order("exam_date", { ascending: false }),
    supabase.from("courses").select("id, code, title, department_id"),
    supabase.from("departments").select("id, name"),
    supabase.from("semesters").select("id, number"),
  ]);

  const courseInfo = new Map((courses ?? []).map((c) => [c.id, c]));
  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Exam Schedule Management</CardTitle>
          <CreateExamScheduleDialog courses={courses ?? []} departments={departments ?? []} semesters={semesters ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(exams ?? []).map((exam) => {
              const course = courseInfo.get(exam.course_id);
              return (
                <TableRow key={exam.id}>
                  <TableCell>{course ? departmentNames.get(course.department_id) : "—"}</TableCell>
                  <TableCell className="font-medium">{course?.code ?? "N/A"}</TableCell>
                  <TableCell>{new Date(exam.exam_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell>{exam.room ?? "TBD"}</TableCell>
                </TableRow>
              );
            })}
            {(!exams || exams.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-4 text-center text-gray-500">
                  No exam schedules found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
