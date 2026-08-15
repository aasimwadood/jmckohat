import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateDirectorateDialog, ToggleOrgStatusButton } from "@/components/features/org/org-dialogs";

export default async function HedDirectoratesPage() {
  await requireRole("hed_admin");
  const supabase = await createClient();

  const [{ data: directorates }, { data: jmcs }] = await Promise.all([
    supabase.from("directorates").select("*").order("name"),
    supabase.from("jmcs").select("id, directorate_id"),
  ]);
  const jmcCountByDirectorate = new Map<string, number>();
  for (const j of jmcs ?? []) {
    jmcCountByDirectorate.set(j.directorate_id, (jmcCountByDirectorate.get(j.directorate_id) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Directorates</CardTitle>
          <CreateDirectorateDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>JMCs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(directorates ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.code}</TableCell>
                <TableCell>{jmcCountByDirectorate.get(d.id) ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "active" ? "default" : "destructive"} className="capitalize">
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ToggleOrgStatusButton kind="directorate" id={d.id} status={d.status} />
                </TableCell>
              </TableRow>
            ))}
            {(!directorates || directorates.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                  No directorates yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
