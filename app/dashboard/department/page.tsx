import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computeGpa } from "@/lib/utils/grading";
import Link from "next/link";

export default async function DepartmentOverviewPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: department } = await supabase.from("departments").select("name").eq("id", profile.departmentId).single();

  const [{ data: students }, { data: courses }, { data: faculty }] = await Promise.all([
    supabase.from("profiles").select("id").eq("department_id", profile.departmentId).eq("role", "student"),
    supabase.from("courses").select("id").eq("department_id", profile.departmentId),
    supabase.from("profiles").select("id").eq("department_id", profile.departmentId).eq("role", "faculty"),
  ]);

  const departmentCourseIds = (courses ?? []).map((c) => c.id);
  const { data: results } =
    departmentCourseIds.length > 0
      ? await supabase.from("results").select("total").in("course_id", departmentCourseIds)
      : { data: [] };

  const avgGpa = computeGpa((results ?? []).map((r) => r.total));

  const { data: recentResults } =
    departmentCourseIds.length > 0
      ? await supabase
          .from("results")
          .select("id, student_profile_id, course_id, total, submitted_by, submitted_at")
          .in("course_id", departmentCourseIds)
          .order("submitted_at", { ascending: false })
          .limit(10)
      : { data: [] };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Department Academic Dashboard</h1>
        <p className="text-gray-600">{department?.name ?? "Department"}</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Stat label="Total Students" value={(students ?? []).length} />
          <Stat label="Active Courses" value={(courses ?? []).length} />
          <Stat label="Faculty Members" value={(faculty ?? []).length} />
          <Stat label="Avg GPA" value={avgGpa.toFixed(2)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recently Submitted Marks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Total</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentResults ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.total}</TableCell>
                    <TableCell>{new Date(r.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link href="/dashboard/department/marks">
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!recentResults || recentResults.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-4 text-center text-gray-500">
                      No marks submitted yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
