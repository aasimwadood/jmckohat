import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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

  const [{ data: programs }, { data: courses }] = await Promise.all([
    supabase.from("programs").select("id, name, degree_level").eq("department_id", profile.departmentId),
    supabase.from("courses").select("id, code, title, credits, program_id").eq("department_id", profile.departmentId),
  ]);

  const coursesByProgram = new Map<string, typeof courses>();
  const unassigned: typeof courses = [];
  for (const c of courses ?? []) {
    if (c.program_id) {
      const list = coursesByProgram.get(c.program_id) ?? [];
      list.push(c);
      coursesByProgram.set(c.program_id, list);
    } else {
      unassigned!.push(c);
    }
  }

  return (
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(coursesByProgram.get(program.id) ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.credits}</TableCell>
                  </TableRow>
                ))}
                {(coursesByProgram.get(program.id) ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No courses assigned to this program yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ))}
        {(!programs || programs.length === 0) && <p className="text-gray-500">No programs configured for this department yet.</p>}
      </CardContent>
    </Card>
  );
}
