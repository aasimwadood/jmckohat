import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { letterGrade } from "@/lib/utils/grading";
import { FinalExamCell } from "./final-exam-cell";

export default async function ControllerResultsPage() {
  await requireRole("controller");
  const supabase = await createClient();

  const { data: results } = await supabase.from("results").select("*").order("submitted_at", { ascending: false }).limit(100);

  const courseIds = [...new Set((results ?? []).map((r) => r.course_id))];
  const studentIds = [...new Set((results ?? []).map((r) => r.student_profile_id))];
  const [{ data: courses }, { data: students }] = await Promise.all([
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    studentIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] }),
  ]);
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Continuous Assessment</TableHead>
              <TableHead>Final Exam (University, /40)</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(results ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{studentNames.get(r.student_profile_id) ?? r.student_profile_id}</TableCell>
                <TableCell>{courseLabels.get(r.course_id)}</TableCell>
                <TableCell>{(r.quiz1 + r.quiz2 + r.midterm + r.assignments_score).toFixed(1)} / 60</TableCell>
                <TableCell>
                  <FinalExamCell
                    studentProfileId={r.student_profile_id}
                    courseId={r.course_id}
                    semesterId={r.semester_id}
                    finalExam={r.final_exam}
                  />
                </TableCell>
                <TableCell>{r.total}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{letterGrade(r.total)}</Badge>
                </TableCell>
                <TableCell>{new Date(r.submitted_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!results || results.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                  No results submitted yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
