import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmStudentShiftImportButton } from "@/components/features/students/confirm-student-shift-import-button";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

const ROW_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  valid: "secondary",
  invalid: "destructive",
  applied: "default",
  skipped: "outline",
};

export default async function StudentShiftImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "principal", "department", "focal_person_intermediate");
  const { id } = await params;
  const supabase = await createClient();

  const { data: imp } = await supabase.from("student_shift_imports").select("*").eq("id", id).single();
  if (!imp) notFound();

  const { data: rows } = await supabase.from("student_shift_import_rows").select("*").eq("import_id", id).order("row_number");

  const summary = [
    { label: "Total Rows", value: imp.total_rows },
    { label: "Valid", value: imp.valid_rows },
    { label: "Invalid", value: imp.invalid_rows },
    { label: "Applied", value: imp.applied_rows },
    { label: "Skipped", value: imp.skipped_rows },
  ];

  return (
    <div className="space-y-6">
      <LiveRefresh table="student_shift_imports" filter={`id=eq.${id}`} />
      <LiveRefresh table="student_shift_import_rows" filter={`import_id=eq.${id}`} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{imp.original_filename}</CardTitle>
            {imp.status === "previewed" && <ConfirmStudentShiftImportButton importId={imp.id} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {summary.map((s) => (
              <div key={s.label} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rows</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Registration No.</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.row_number}</TableCell>
                  <TableCell>{row.registration_number ?? "—"}</TableCell>
                  <TableCell>{row.shift_code ?? "—"}</TableCell>
                  <TableCell>{row.group_code ?? "—"}</TableCell>
                  <TableCell>{row.section_code ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={ROW_STATUS_VARIANT[row.status] ?? "secondary"} className="capitalize">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{row.error_message?.replace(/_/g, " ") ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(!rows || rows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No rows in this import.
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
