import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SubmitAssignmentCell } from "./submit-assignment-dialog";

export default async function StudentAssignmentsPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const courseIds: string[] = [];
  if (profile.currentSemesterId) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_profile_id", profile.id)
      .eq("semester_id", profile.currentSemesterId);
    courseIds.push(...(enrollments ?? []).map((e) => e.course_id));
  }

  const [{ data: assignments }, { data: courses }, { data: submissions }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from("assignments").select("*").in("course_id", courseIds).order("due_date")
      : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    supabase.from("assignment_submissions").select("*").eq("student_profile_id", profile.id),
  ]);

  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const submissionByAssignment = new Map((submissions ?? []).map((s) => [s.assignment_id, s]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        {!assignments || assignments.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No assignments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const submission = submissionByAssignment.get(assignment.id);
                return (
                  <TableRow key={assignment.id}>
                    <TableCell>{courseLabels.get(assignment.course_id) ?? assignment.course_id}</TableCell>
                    <TableCell>{assignment.title}</TableCell>
                    <TableCell>{new Date(assignment.due_date).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{submission ? "Submitted" : "Pending"}</TableCell>
                    <TableCell>{submission?.grade ?? "—"}</TableCell>
                    <TableCell>
                      <SubmitAssignmentCell
                        assignmentId={assignment.id}
                        title={assignment.title}
                        description={assignment.description}
                        submitted={!!submission}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
