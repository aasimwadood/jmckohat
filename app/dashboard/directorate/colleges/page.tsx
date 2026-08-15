import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateCollegeDialog, ToggleOrgStatusButton, ProvisionOrgAdminDialog } from "@/components/features/org/org-dialogs";

export default async function DirectorateCollegesPage() {
  const profile = await requireRole("directorate_admin");
  const supabase = await createClient();

  if (!profile.directorateId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your directorate is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: jmcs } = await supabase.from("jmcs").select("id, name").eq("directorate_id", profile.directorateId).order("name");
  const jmcIds = (jmcs ?? []).map((j) => j.id);
  const jmcNameById = new Map((jmcs ?? []).map((j) => [j.id, j.name]));

  const [{ data: colleges }, { data: collegeTypes }, { data: admins }] = await Promise.all([
    jmcIds.length > 0
      ? supabase.from("colleges").select("*").in("jmc_id", jmcIds).order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("college_types").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "college_admin"),
  ]);
  const typeNameById = new Map((collegeTypes ?? []).map((t) => [t.id, t.name]));
  const adminNameById = new Map((admins ?? []).map((a) => [a.id, a.full_name]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Colleges in Your Directorate</CardTitle>
          <CreateCollegeDialog jmcs={jmcs ?? []} collegeTypes={collegeTypes ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>JMC</TableHead>
              <TableHead>College Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(colleges ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {c.name}
                  <p className="text-xs text-gray-500">{c.code}</p>
                </TableCell>
                <TableCell>{typeNameById.get(c.college_type_id) ?? "—"}</TableCell>
                <TableCell>{jmcNameById.get(c.jmc_id) ?? "—"}</TableCell>
                <TableCell>
                  {c.college_admin_profile_id ? (adminNameById.get(c.college_admin_profile_id) ?? "—") : "Unassigned"}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "default" : "destructive"} className="capitalize">
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <ToggleOrgStatusButton kind="college" id={c.id} status={c.status} />
                    <ProvisionOrgAdminDialog role="college_admin" orgId={c.id} label="College Admin" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!colleges || colleges.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No colleges yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
