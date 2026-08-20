import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { GroupForm } from "@/components/features/fees/group-form";
import { DeleteGroupButton } from "@/components/features/fees/delete-group-button";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function GroupsPage() {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");
  const supabase = await createClient();

  // focal_person_intermediate's own department IS the Intermediate
  // department; admin/principal manage the same one Intermediate
  // department that exists for their college.
  const departmentId =
    profile.role === "focal_person_intermediate"
      ? profile.departmentId
      : (await supabase.from("departments").select("id").eq("code", "IN").eq("college_id", profile.collegeId ?? "").maybeSingle()).data?.id ?? null;

  if (!departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No Intermediate department is configured for your college yet.
        </CardContent>
      </Card>
    );
  }

  const { data: groups } = await supabase.from("groups").select("*").eq("department_id", departmentId).order("sort_order");

  return (
    <div className="space-y-6">
      <LiveRefresh table="groups" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Groups</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Intermediate disciplines — Pre-Medical, Pre-Engineering, Computer Science, Arts, Humanities, and any others your college offers.
              </p>
            </div>
            <GroupForm departmentId={departmentId} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(groups ?? []).map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.code}</TableCell>
                  <TableCell>
                    <Badge variant={g.status === "active" ? "default" : "secondary"} className="capitalize">
                      {g.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <GroupForm departmentId={departmentId} initial={{ id: g.id, name: g.name, code: g.code }} />
                      <DeleteGroupButton id={g.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!groups || groups.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No groups configured yet.
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
