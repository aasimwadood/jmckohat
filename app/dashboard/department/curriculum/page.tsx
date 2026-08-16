import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AddCourseForm } from "@/components/features/curriculum/add-course-form";
import { CourseTeachers } from "@/components/features/curriculum/course-teachers";
import { EditCourseDialog } from "@/components/features/curriculum/edit-course-dialog";

export default async function DepartmentCurriculumPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: programs }, { data: courses }, { data: teachers }, { data: departments }, { data: semesters }] = await Promise.all([
    supabase.from("programs").select("id, name, degree_level").eq("department_id", profile.departmentId),
    supabase.from("courses").select("id, code, title, credits, program_id").eq("department_id", profile.departmentId),
    // College-wide, not department-scoped: a course can be taught by a
    // teacher from another department (service courses — e.g. English,
    // Islamic Studies, Pakistan Studies staff teaching a CS-curriculum
    // course, exactly like the real timetable in §18). RLS only checks
    // that the *course* is this department's own, never the teacher's.
    supabase
      .from("profiles")
      .select("id, full_name, department_id")
      .eq("college_id", profile.collegeId ?? "")
      .in("role", ["faculty", "department", "coordinator", "controller"])
      .order("full_name"),
    supabase.from("departments").select("id, name"),
    supabase.from("semesters").select("id, number").order("number"),
  ]);

  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: courseFaculty } = courseIds.length
    ? await supabase.from("course_faculty").select("course_id, faculty_profile_id, semester_id, offering_type").in("course_id", courseIds)
    : { data: [] };

  const teacherNames = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
  const semesterNumbers = new Map((semesters ?? []).map((s) => [s.id, s.number]));
  const assignmentsByCourse = new Map<
    string,
    { facultyProfileId: string; facultyName: string; semesterId: string; semesterNumber: number; offeringType: "fresh" | "repeat" }[]
  >();
  for (const cf of courseFaculty ?? []) {
    const list = assignmentsByCourse.get(cf.course_id) ?? [];
    list.push({
      facultyProfileId: cf.faculty_profile_id,
      facultyName: teacherNames.get(cf.faculty_profile_id) ?? "Unknown",
      semesterId: cf.semester_id,
      semesterNumber: semesterNumbers.get(cf.semester_id) ?? 0,
      offeringType: cf.offering_type,
    });
    assignmentsByCourse.set(cf.course_id, list);
  }

  const coursesByProgram = new Map<string, typeof courses>();
  const unassigned: NonNullable<typeof courses> = [];
  for (const c of courses ?? []) {
    if (c.program_id) {
      const list = coursesByProgram.get(c.program_id) ?? [];
      list.push(c);
      coursesByProgram.set(c.program_id, list);
    } else {
      unassigned.push(c);
    }
  }

  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const teacherOptions = (teachers ?? []).map((t) => ({
    id: t.id,
    name: t.full_name,
    department: t.department_id ? (departmentNames.get(t.department_id) ?? "Unknown") : "No department",
    isOwnDepartment: t.department_id === profile.departmentId,
  }));
  const semesterOptions = (semesters ?? []).map((s) => ({ id: s.id, number: s.number }));
  const programOptions = (programs ?? []).map((p) => ({ id: p.id, name: p.name }));

  const renderCourseTable = (list: typeof courses | undefined) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Code</TableHead>
          <TableHead className="w-56">Title</TableHead>
          <TableHead className="w-20">Credits</TableHead>
          <TableHead>Teachers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(list ?? []).map((c) => (
          <TableRow key={c.id}>
            <TableCell className="align-top">
              <div className="flex items-center gap-1">
                {c.code}
                <EditCourseDialog course={c} programs={programOptions} />
              </div>
            </TableCell>
            <TableCell className="align-top">{c.title}</TableCell>
            <TableCell className="align-top">{c.credits}</TableCell>
            <TableCell>
              <CourseTeachers
                courseId={c.id}
                teachers={teacherOptions}
                semesters={semesterOptions}
                assignments={assignmentsByCourse.get(c.id) ?? []}
              />
            </TableCell>
          </TableRow>
        ))}
        {(!list || list.length === 0) && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-gray-500">
              No courses here yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Course</CardTitle>
        </CardHeader>
        <CardContent>
          <AddCourseForm programs={(programs ?? []).map((p) => ({ id: p.id, name: p.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Curriculum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(programs ?? []).map((program) => (
            <div key={program.id}>
              <h3 className="mb-2 text-gray-900">
                {program.name} <span className="text-sm text-gray-500">({program.degree_level})</span>
              </h3>
              {renderCourseTable(coursesByProgram.get(program.id))}
            </div>
          ))}
          {unassigned.length > 0 && (
            <div>
              <h3 className="mb-2 text-gray-900">Not assigned to a program</h3>
              {renderCourseTable(unassigned)}
            </div>
          )}
          {(!programs || programs.length === 0) && unassigned.length === 0 && (
            <p className="text-gray-500">No programs configured for this department yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
