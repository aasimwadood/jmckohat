import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/supabase/storage";
import { CreateAssignmentDialog } from "./create-assignment-dialog";
import { GradeSubmissionsDialog } from "./grade-submissions-dialog";

export default async function FacultyAssignmentsPage() {
  const profile = await requireRole("faculty", "department", "coordinator", "controller");
  const supabase = await createClient();

  const { data: courseFaculty } = await supabase.from("course_faculty").select("course_id").eq("faculty_profile_id", profile.id);
  const courseIds = [...new Set((courseFaculty ?? []).map((c) => c.course_id))];

  const [{ data: courses }, { data: assignments }, { data: enrollments }] = await Promise.all([
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from("assignments").select("*").in("course_id", courseIds).order("due_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from("enrollments").select("student_profile_id, course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const studentsPerCourse = new Map<string, number>();
  for (const e of enrollments ?? []) {
    studentsPerCourse.set(e.course_id, (studentsPerCourse.get(e.course_id) ?? 0) + 1);
  }

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: submissions } =
    assignmentIds.length > 0
      ? await supabase.from("assignment_submissions").select("*").in("assignment_id", assignmentIds)
      : { data: [] };

  const submissionsByAssignment = new Map<string, typeof submissions>();
  for (const s of submissions ?? []) {
    const list = submissionsByAssignment.get(s.assignment_id) ?? [];
    list.push(s);
    submissionsByAssignment.set(s.assignment_id, list);
  }

  const studentIds = [...new Set((submissions ?? []).map((s) => s.student_profile_id))];
  const { data: submissionStudents } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((submissionStudents ?? []).map((s) => [s.id, s.full_name]));

  const fileUrls = new Map<string, string | null>();
  for (const s of submissions ?? []) {
    if (s.file_path) fileUrls.set(s.id, await getSignedUrl("assignment-submissions", s.file_path));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Assignments</CardTitle>
          <CreateAssignmentDialog courses={courses ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Max Marks</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(assignments ?? []).map((assignment) => {
              const subs = submissionsByAssignment.get(assignment.id) ?? [];
              return (
                <TableRow key={assignment.id}>
                  <TableCell>{courseLabels.get(assignment.course_id)}</TableCell>
                  <TableCell>{assignment.title}</TableCell>
                  <TableCell>{new Date(assignment.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>{assignment.max_marks}</TableCell>
                  <TableCell>
                    {subs.length}/{studentsPerCourse.get(assignment.course_id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <GradeSubmissionsDialog
                      title={assignment.title}
                      maxMarks={assignment.max_marks}
                      submissions={(subs ?? []).map((s) => ({
                        id: s.id,
                        studentName: studentNames.get(s.student_profile_id) ?? s.student_profile_id,
                        grade: s.grade,
                        fileUrl: s.file_path ? (fileUrls.get(s.id) ?? null) : null,
                      }))}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {(assignments ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No assignments yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
