import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLogsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: logs } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_profile_id).filter((id): id is string => !!id))];
  const { data: actors } =
    actorIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const actorNames = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                <TableCell>{log.entity}</TableCell>
                <TableCell>{log.actor_profile_id ? (actorNames.get(log.actor_profile_id) ?? "—") : "System"}</TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {(!logs || logs.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No log entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
