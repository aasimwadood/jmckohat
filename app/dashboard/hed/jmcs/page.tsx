import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateJmcDialog, ToggleOrgStatusButton, ProvisionOrgAdminDialog } from "@/components/features/org/org-dialogs";

export default async function HedJmcsPage() {
  await requireRole("hed_admin");
  const supabase = await createClient();

  const [{ data: jmcs }, { data: directorates }, { data: colleges }, { data: admins }] = await Promise.all([
    supabase.from("jmcs").select("*").order("name"),
    supabase.from("directorates").select("id, name").order("name"),
    supabase.from("colleges").select("id, jmc_id"),
    supabase.from("profiles").select("id, full_name").eq("role", "jmc_admin"),
  ]);

  const directorateNameById = new Map((directorates ?? []).map((d) => [d.id, d.name]));
  const collegeCountByJmc = new Map<string, number>();
  for (const c of colleges ?? []) {
    collegeCountByJmc.set(c.jmc_id, (collegeCountByJmc.get(c.jmc_id) ?? 0) + 1);
  }
  const adminNameById = new Map((admins ?? []).map((a) => [a.id, a.full_name]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>JMCs</CardTitle>
          <CreateJmcDialog directorates={directorates ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Directorate</TableHead>
              <TableHead>Colleges</TableHead>
              <TableHead>JMC Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jmcs ?? []).map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">
                  {j.name}
                  <p className="text-xs text-gray-500">{j.code}</p>
                </TableCell>
                <TableCell>{directorateNameById.get(j.directorate_id) ?? "—"}</TableCell>
                <TableCell>{collegeCountByJmc.get(j.id) ?? 0}</TableCell>
                <TableCell>
                  {j.jmc_admin_profile_id ? (adminNameById.get(j.jmc_admin_profile_id) ?? "—") : "Unassigned"}
                </TableCell>
                <TableCell>
                  <Badge variant={j.status === "active" ? "default" : "destructive"} className="capitalize">
                    {j.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <ToggleOrgStatusButton kind="jmc" id={j.id} status={j.status} />
                    <ProvisionOrgAdminDialog role="jmc_admin" orgId={j.id} label="JMC Admin" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!jmcs || jmcs.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No JMCs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
