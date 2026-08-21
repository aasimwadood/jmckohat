import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ShiftFilter } from "@/components/features/students/shift-filter";

// View-only, mirroring app/dashboard/department/marks/page.tsx — Focal
// Person's "results" authority is overview/reporting, not raw grade-entry
// (that stays a teaches_course()-gated faculty concept, see 0076's own
// comment on why results_write_faculty_own_course was left untouched).
export default async function FocalPersonMarksPage({ searchParams }: { searchParams: Promise<{ shiftId?: string }> }) {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { shiftId } = await searchParams;

  const [{ data: courses }, { data: students }, { data: shifts }, { data: groups }, { data: sections }] = await Promise.all([
    supabase.from("courses").select("id, code, title").eq("department_id", profile.departmentId),
    supabase
      .from("profiles")
      .select("id, full_name, shift_id, group_id, section_id")
      .eq("department_id", profile.departmentId)
      .eq("role", "student"),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("groups").select("id, name").eq("department_id", profile.departmentId).order("sort_order"),
    supabase.from("sections").select("id, name, group_id").eq("department_id", profile.departmentId).order("sort_order"),
  ]);
  const courseIds = (courses ?? []).map((c) => c.id);
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const sectionName = new Map((sections ?? []).map((s) => [s.id, s.name]));
  const hasGroups = (groups ?? []).length > 0;

  const { data: results } =
    courseIds.length > 0
      ? await supabase.from("results").select("*").in("course_id", courseIds).order("submitted_at", { ascending: false })
      : { data: [] };

  const facultyIds = [...new Set((results ?? []).map((r) => r.submitted_by).filter((id): id is string => !!id))];
  const { data: faculty } =
    facultyIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", facultyIds) : { data: [] };
  const facultyNames = new Map((faculty ?? []).map((f) => [f.id, f.full_name]));

  const visibleResults = (results ?? []).filter((r) => !shiftId || studentById.get(r.student_profile_id)?.shift_id === shiftId);

  return (
    <div className="space-y-6">
      <ShiftFilter shifts={shifts ?? []} selectedId={shiftId ?? ""} basePath="/dashboard/focal-person/marks" />
      <Card>
        <CardHeader>
          <CardTitle>Marks Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Shift</TableHead>
                {hasGroups && <TableHead>Group / Section</TableHead>}
                <TableHead>Submitted By</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleResults.map((r) => {
                const student = studentById.get(r.student_profile_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{student?.full_name ?? r.student_profile_id}</TableCell>
                    <TableCell>{courseLabels.get(r.course_id)}</TableCell>
                    <TableCell>
                      {student?.shift_id ? (
                        <Badge variant="outline">{shiftName.get(student.shift_id) ?? "—"}</Badge>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    {hasGroups && (
                      <TableCell>
                        {student?.group_id ? (
                          <span className="text-sm">
                            {groupName.get(student.group_id) ?? "—"}
                            {student.section_id ? ` — ${sectionName.get(student.section_id) ?? "—"}` : ""}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{r.submitted_by ? (facultyNames.get(r.submitted_by) ?? "—") : "—"}</TableCell>
                    <TableCell>{r.total}</TableCell>
                    <TableCell>{new Date(r.submitted_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
              {visibleResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={hasGroups ? 7 : 6} className="py-8 text-center text-gray-500">
                    No marks submitted yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
