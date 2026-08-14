import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateCampusEventDialog } from "./create-event-dialog";

export default async function AdministrationEventsPage() {
  await requireRole("administration");
  const supabase = await createClient();

  const { data: events } = await supabase.from("campus_events").select("*").order("event_date");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Events &amp; Facilities</CardTitle>
          <CreateCampusEventDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(events ?? []).map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                <TableCell>{event.location ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(!events || events.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-gray-500">
                  No events scheduled yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
