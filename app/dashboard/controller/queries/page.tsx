import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ResolveQueryDialog } from "./resolve-query-dialog";

export default async function ControllerQueriesPage() {
  await requireRole("controller");
  const supabase = await createClient();

  const { data: queries } = await supabase.from("result_queries").select("*").order("requested_at", { ascending: false });

  const studentIds = [...new Set((queries ?? []).map((q) => q.student_profile_id))];
  const courseIds = [...new Set((queries ?? []).map((q) => q.course_id))];
  const [{ data: students }, { data: courses }] = await Promise.all([
    studentIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
  ]);
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result Queries / Rechecking</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(queries ?? []).map((q) => (
              <TableRow key={q.id}>
                <TableCell>{studentNames.get(q.student_profile_id) ?? q.student_profile_id}</TableCell>
                <TableCell>{courseLabels.get(q.course_id)}</TableCell>
                <TableCell className="max-w-xs truncate">{q.reason}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {q.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{q.status === "pending" && <ResolveQueryDialog queryId={q.id} />}</TableCell>
              </TableRow>
            ))}
            {(!queries || queries.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                  No result queries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
