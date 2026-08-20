import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SectionForm } from "@/components/features/fees/section-form";
import { DeleteSectionButton } from "@/components/features/fees/delete-section-button";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function SectionsPage() {
  const profile = await requireRole("admin", "principal", "focal_person_intermediate");
  const supabase = await createClient();

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

  const [{ data: sections }, { data: groups }] = await Promise.all([
    supabase.from("sections").select("*").eq("department_id", departmentId).order("sort_order"),
    supabase.from("groups").select("id, name").eq("department_id", departmentId).order("sort_order"),
  ]);

  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));

  return (
    <div className="space-y-6">
      <LiveRefresh table="sections" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sections</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Class sections (A/B/C, ...) nested under a Group — a Pre-Medical section and a Computer Science section are different classes of students.
              </p>
            </div>
            <SectionForm departmentId={departmentId} groups={groups ?? []} />
          </div>
        </CardHeader>
        <CardContent>
          {(groups ?? []).length === 0 && (
            <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">Create a Group first before adding sections.</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sections ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{groupName.get(s.group_id) ?? "—"}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <SectionForm
                        departmentId={departmentId}
                        groups={groups ?? []}
                        initial={{ id: s.id, name: s.name, code: s.code, groupId: s.group_id }}
                      />
                      <DeleteSectionButton id={s.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!sections || sections.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No sections configured yet.
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
