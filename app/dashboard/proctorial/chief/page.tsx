import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssignDutyForm } from "@/components/features/proctorial/assign-duty-form";
import { DutyStatusSelect } from "@/components/features/proctorial/duty-status-select";
import { FileComplaintForm } from "@/components/features/proctorial/file-complaint-form";
import { ComplaintStatusSelect } from "@/components/features/proctorial/complaint-status-select";

export default async function ChiefProctorPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: myAssignments } = await supabase.from("designation_assignments").select("designation_type_id").eq("profile_id", profile.id);
  const typeIds = (myAssignments ?? []).map((a) => a.designation_type_id);
  const { data: myTypes } = typeIds.length ? await supabase.from("designation_types").select("id, name").in("id", typeIds) : { data: [] };
  const isChiefProctor = (myTypes ?? []).some((t) => t.name === "Chief Proctor");

  if (!isChiefProctor) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          You are not currently designated Chief Proctor.
        </CardContent>
      </Card>
    );
  }

  const { data: staffProctorType } = await supabase.from("designation_types").select("id").eq("name", "Staff Proctor").single();
  const { data: staffProctorAssignments } = staffProctorType
    ? await supabase.from("designation_assignments").select("profile_id, department_id").eq("designation_type_id", staffProctorType.id)
    : { data: [] };

  const profileIds = (staffProctorAssignments ?? []).map((a) => a.profile_id);
  const [{ data: profiles }, { data: departments }] = await Promise.all([
    profileIds.length ? supabase.from("profiles").select("id, full_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    supabase.from("departments").select("id, name"),
  ]);
  const profileNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const deptNames = new Map((departments ?? []).map((d) => [d.id, d.name]));

  const staffProctors = (staffProctorAssignments ?? [])
    .filter((a) => a.department_id)
    .map((a) => ({
      profileId: a.profile_id,
      name: profileNames.get(a.profile_id) ?? "Unknown",
      departmentId: a.department_id as string,
      departmentName: deptNames.get(a.department_id as string) ?? "Unknown",
    }));

  const [{ data: duties }, { data: complaints }] = await Promise.all([
    supabase.from("proctor_duties").select("*").order("duty_date", { ascending: false }),
    supabase.from("proctor_complaints").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Duty</CardTitle>
        </CardHeader>
        <CardContent>
          {staffProctors.length === 0 ? (
            <p className="text-sm text-gray-500">No Staff Proctors have been assigned yet — the Principal assigns these from Designations.</p>
          ) : (
            <AssignDutyForm staffProctors={staffProctors} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Duties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(duties ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{profileNames.get(d.assigned_to) ?? "Unknown"}</TableCell>
                    <TableCell>{d.duty_type}</TableCell>
                    <TableCell>{new Date(d.duty_date).toLocaleDateString()}</TableCell>
                    <TableCell>{d.shift_time ?? "—"}</TableCell>
                    <TableCell>{d.location ?? "—"}</TableCell>
                    <TableCell>
                      <DutyStatusSelect dutyId={d.id} status={d.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {(!duties || duties.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                      No duties assigned yet.
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
        <CardContent className="space-y-4">
          <FileComplaintForm students={[]} />
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
                    <TableCell>{profileNames.get(c.raised_by) ?? (c.raised_by === profile.id ? "You" : "Unknown")}</TableCell>
                    <TableCell className="max-w-md truncate">{c.description}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <ComplaintStatusSelect complaintId={c.id} status={c.status} />
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
