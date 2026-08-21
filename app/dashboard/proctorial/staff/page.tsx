import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DutyStatusSelect } from "@/components/features/proctorial/duty-status-select";
import { FileComplaintForm } from "@/components/features/proctorial/file-complaint-form";
import { AddFineForm } from "@/components/features/fines/add-fine-form";
import { fetchAllCollegeStudents } from "@/lib/services/students";

export default async function StaffProctorPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: myAssignments } = await supabase.from("designation_assignments").select("designation_type_id").eq("profile_id", profile.id);
  const typeIds = (myAssignments ?? []).map((a) => a.designation_type_id);
  const { data: myTypes } = typeIds.length ? await supabase.from("designation_types").select("id, name").in("id", typeIds) : { data: [] };
  const isStaffProctor = (myTypes ?? []).some((t) => t.name === "Staff Proctor");

  if (!isStaffProctor) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          You are not currently designated a Staff Proctor.
        </CardContent>
      </Card>
    );
  }

  const [{ data: duties }, { data: complaints }, collegeStudents] = await Promise.all([
    supabase.from("proctor_duties").select("*").eq("assigned_to", profile.id).order("duty_date", { ascending: false }),
    supabase.from("proctor_complaints").select("*").eq("raised_by", profile.id).order("created_at", { ascending: false }),
    profile.collegeId ? fetchAllCollegeStudents(supabase, profile.collegeId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fines</CardTitle>
        </CardHeader>
        <CardContent>
          <AddFineForm
            title="Add Proctorial Board Fine"
            fineType="proctorial_fine"
            students={collegeStudents.map((s) => ({ id: s.id, name: s.full_name, registrationNumber: s.registration_number }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>My Proctor Duty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(duties ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.duty_type}</TableCell>
                    <TableCell>{new Date(d.duty_date).toLocaleDateString()}</TableCell>
                    <TableCell>{d.shift_time ?? "—"}</TableCell>
                    <TableCell>{d.location ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{d.notes ?? "—"}</TableCell>
                    <TableCell>
                      <DutyStatusSelect dutyId={d.id} status={d.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {(!duties || duties.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                      No duty assigned to you yet.
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
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(complaints ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-md truncate">{c.description}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{c.status}</TableCell>
                  </TableRow>
                ))}
                {(!complaints || complaints.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-gray-500">
                      You haven&apos;t filed any complaints.
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
