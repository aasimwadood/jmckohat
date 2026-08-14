import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { letterGrade } from "@/lib/utils/grading";

export default async function StudentResultsPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("results")
    .select("*")
    .eq("student_profile_id", profile.id)
    .order("submitted_at", { ascending: false });

  const courseIds = [...new Set((results ?? []).map((r) => r.course_id))];
  const { data: courses } =
    courseIds.length > 0 ? await supabase.from("courses").select("id, code, title").in("id", courseIds) : { data: [] };
  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results &amp; Grades</CardTitle>
      </CardHeader>
      <CardContent>
        {!results || results.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No results available yet. Results will appear here once they are finalized.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Quiz 1</TableHead>
                <TableHead>Quiz 2</TableHead>
                <TableHead>Midterm</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{courseLabels.get(result.course_id) ?? result.course_id}</TableCell>
                  <TableCell>{result.quiz1}</TableCell>
                  <TableCell>{result.quiz2}</TableCell>
                  <TableCell>{result.midterm}</TableCell>
                  <TableCell>{result.assignments_score}</TableCell>
                  <TableCell>
                    <Badge variant={result.total >= 50 ? "default" : "destructive"}>{result.total}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{letterGrade(result.total)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
