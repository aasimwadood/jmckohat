import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ResolveTicketButton } from "./resolve-ticket-button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "secondary",
  in_progress: "outline",
  resolved: "default",
  closed: "default",
};

export default async function AdministrationHelpdeskPage() {
  await requireRole("administration");
  const supabase = await createClient();

  const { data: tickets } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });

  const raisedByIds = [...new Set((tickets ?? []).map((t) => t.raised_by).filter((id): id is string => !!id))];
  const { data: people } =
    raisedByIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", raisedByIds) : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Helpdesk &amp; Support</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Raised By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tickets ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="font-medium">{t.subject}</p>
                  {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                </TableCell>
                <TableCell>{t.raised_by ? (names.get(t.raised_by) ?? "—") : "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[t.status]} className="capitalize">
                    {t.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ResolveTicketButton ticketId={t.id} status={t.status} />
                </TableCell>
              </TableRow>
            ))}
            {(!tickets || tickets.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  No support tickets yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
