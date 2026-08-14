import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TranscriptStatusButtons } from "./status-buttons";

export default async function ControllerTranscriptsPage() {
  await requireRole("controller");
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("transcript_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  const studentIds = [...new Set((requests ?? []).map((r) => r.student_profile_id))];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript Generation</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{studentNames.get(r.student_profile_id) ?? r.student_profile_id}</TableCell>
                <TableCell>{new Date(r.requested_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TranscriptStatusButtons requestId={r.id} status={r.status} />
                </TableCell>
              </TableRow>
            ))}
            {(!requests || requests.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No transcript requests yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
