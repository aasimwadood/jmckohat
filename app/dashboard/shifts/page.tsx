import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ShiftForm } from "@/components/features/fees/shift-form";
import { DeleteShiftButton } from "@/components/features/fees/delete-shift-button";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function ShiftsPage() {
  const profile = await requireRole("admin", "principal");
  const supabase = await createClient();

  const { data: shifts } = profile.collegeId
    ? await supabase.from("shifts").select("*").eq("college_id", profile.collegeId).order("sort_order")
    : { data: [] };

  return (
    <div className="space-y-6">
      <LiveRefresh table="shifts" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shifts</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Morning/Evening (or more) — used to route students to the right fee voucher bank account and, later,
                Intermediate class structure.
              </p>
            </div>
            <ShiftForm />
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
              {(shifts ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <ShiftForm initial={{ id: s.id, name: s.name, code: s.code }} />
                      <DeleteShiftButton id={s.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!shifts || shifts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No shifts configured yet.
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
