import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CoordinatorFacultyPage() {
  await requireRole("coordinator");
  const supabase = await createClient();

  const [{ data: faculty }, { data: courseFaculty }, { data: entries }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, department_id").eq("role", "faculty"),
    supabase.from("course_faculty").select("faculty_profile_id, course_id"),
    supabase.from("timetable_entries").select("faculty_profile_id"),
    supabase.from("departments").select("id, name"),
  ]);

  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const coursesByFaculty = new Map<string, Set<string>>();
  for (const cf of courseFaculty ?? []) {
    const set = coursesByFaculty.get(cf.faculty_profile_id) ?? new Set();
    set.add(cf.course_id);
    coursesByFaculty.set(cf.faculty_profile_id, set);
  }
  const classesByFaculty = new Map<string, number>();
  for (const e of entries ?? []) {
    if (!e.faculty_profile_id) continue;
    classesByFaculty.set(e.faculty_profile_id, (classesByFaculty.get(e.faculty_profile_id) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faculty Coordination</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faculty</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Courses Teaching</TableHead>
              <TableHead>Weekly Classes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(faculty ?? []).map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.full_name}</TableCell>
                <TableCell>{f.department_id ? (departmentNames.get(f.department_id) ?? "—") : "—"}</TableCell>
                <TableCell>{coursesByFaculty.get(f.id)?.size ?? 0}</TableCell>
                <TableCell>{classesByFaculty.get(f.id) ?? 0}</TableCell>
              </TableRow>
            ))}
            {(!faculty || faculty.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No faculty found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
