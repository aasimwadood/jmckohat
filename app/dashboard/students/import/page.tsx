import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StudentShiftImportUploadForm } from "@/components/features/students/student-shift-import-upload-form";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function StudentShiftImportPage() {
  const profile = await requireRole("admin", "principal", "department", "focal_person_intermediate");
  const supabase = await createClient();

  const { data: imports } = profile.collegeId
    ? await supabase
        .from("student_shift_imports")
        .select("*")
        .eq("college_id", profile.collegeId)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-6">
      <LiveRefresh table="student_shift_imports" />
      <Card>
        <CardHeader>
          <CardTitle>Import Shift/Group/Section from CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentShiftImportUploadForm />
          <p className="mt-3 text-xs text-gray-500">
            Expected columns: Registration Number (required), Shift, Group, Section (each optional — a row only updates
            the columns it has a value for). Matches by code, e.g. &quot;evening&quot;, not display name.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(imports ?? []).map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell>
                    <Link href={`/dashboard/students/import/${imp.id}`} className="text-blue-600 hover:underline">
                      {imp.original_filename}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(imp.created_at).toLocaleString()}</TableCell>
                  <TableCell>{imp.total_rows}</TableCell>
                  <TableCell>{imp.applied_rows}</TableCell>
                  <TableCell>
                    <Badge variant={imp.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {imp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!imports || imports.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No files uploaded yet.
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
