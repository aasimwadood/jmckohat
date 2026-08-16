import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const DUTY_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  completed: "default",
  missed: "destructive",
  cancelled: "outline",
};
const COMPLAINT_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  open: "destructive",
  reviewed: "secondary",
  resolved: "default",
};

export default async function PrincipalProctorialBoardPage() {
  const profile = await requireRole("principal");
  const supabase = await createClient();

  if (!profile.collegeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your college is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: chiefType }, { data: staffType }, { data: departments }] = await Promise.all([
    supabase.from("designation_types").select("id").eq("name", "Chief Proctor").single(),
    supabase.from("designation_types").select("id").eq("name", "Staff Proctor").single(),
    supabase.from("departments").select("id, name").eq("college_id", profile.collegeId).order("name"),
  ]);

  if (!chiefType || !staffType) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Proctorial Board designation types are not set up yet.
        </CardContent>
      </Card>
    );
  }

  const [{ data: chiefAssignment }, { data: staffAssignments }, { data: duties }, { data: complaints }] = await Promise.all([
    supabase.from("designation_assignments").select("profile_id").eq("designation_type_id", chiefType.id).eq("college_id", profile.collegeId).maybeSingle(),
    supabase.from("designation_assignments").select("profile_id, department_id").eq("designation_type_id", staffType.id).eq("college_id", profile.collegeId),
    supabase.from("proctor_duties").select("*").order("duty_date", { ascending: false }),
    supabase.from("proctor_complaints").select("*").order("created_at", { ascending: false }),
  ]);

  const allProfileIds = [
    ...(chiefAssignment ? [chiefAssignment.profile_id] : []),
    ...(staffAssignments ?? []).map((a) => a.profile_id),
    ...(duties ?? []).map((d) => d.assigned_to),
    ...(complaints ?? []).map((c) => c.raised_by),
  ];
  const { data: people } = allProfileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", [...new Set(allProfileIds)])
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const staffByDept = new Map((staffAssignments ?? []).map((a) => [a.department_id, a.profile_id]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Proctorial Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Chief Proctor</p>
            <p className="text-gray-900">
              {chiefAssignment ? (names.get(chiefAssignment.profile_id) ?? "Unknown") : "Not assigned"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Staff Proctor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(departments ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{names.get(staffByDept.get(d.id) ?? "") ?? "Not assigned"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-gray-500">
            Assign or change these from the Designations page — this view is for oversight only.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Duty Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(duties ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{names.get(d.assigned_to) ?? "Unknown"}</TableCell>
                    <TableCell>{d.duty_type}</TableCell>
                    <TableCell>{new Date(d.duty_date).toLocaleDateString()}</TableCell>
                    <TableCell>{d.location ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={DUTY_STATUS_VARIANT[d.status] ?? "default"} className="capitalize">
                        {d.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!duties || duties.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-gray-500">
                      No duties recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filed By</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(complaints ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{names.get(c.raised_by) ?? "Unknown"}</TableCell>
                    <TableCell className="max-w-md truncate">{c.description}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={COMPLAINT_STATUS_VARIANT[c.status] ?? "default"} className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!complaints || complaints.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                      No complaints filed yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
