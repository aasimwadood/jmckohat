import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DepartmentMarksPage() {
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

  const { data: results } =
    courseIds.length > 0
      ? await supabase.from("results").select("*").in("course_id", courseIds).order("submitted_at", { ascending: false })
      : { data: [] };

  const facultyIds = [...new Set((results ?? []).map((r) => r.submitted_by).filter((id): id is string => !!id))];
  const { data: faculty } =
    facultyIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", facultyIds) : { data: [] };
  const facultyNames = new Map((faculty ?? []).map((f) => [f.id, f.full_name]));

  const byCourse = new Map<string, number>();
  for (const r of results ?? []) {
    byCourse.set(r.course_id, (byCourse.get(r.course_id) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marks Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(results ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{courseLabels.get(r.course_id)}</TableCell>
                <TableCell>{r.submitted_by ? (facultyNames.get(r.submitted_by) ?? "—") : "—"}</TableCell>
                <TableCell>{r.total}</TableCell>
                <TableCell>{new Date(r.submitted_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!results || results.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No marks submitted yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
