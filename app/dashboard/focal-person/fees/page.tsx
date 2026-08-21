import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VoucherStatusBadge } from "@/components/features/fees/voucher-status-badge";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";
import { ShiftFilter } from "@/components/features/students/shift-filter";
import { CustomVoucherForm } from "@/components/features/fees/custom-voucher-form";

const PROMOTION_STATUS_LABEL: Record<string, string> = {
  fee_pending: "Awaiting Fee",
  pending_registration: "Fee Cleared — Registration Open",
  registration_complete: "Registered",
  promoted: "Promoted",
};

export default async function FocalPersonFeesPage({ searchParams }: { searchParams: Promise<{ shiftId?: string }> }) {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { shiftId } = await searchParams;

  const [{ data: students }, { data: shifts }, { data: groups }, { data: sections }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, shift_id, group_id, section_id, registration_number")
      .eq("department_id", profile.departmentId)
      .eq("role", "student"),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("groups").select("id, name").eq("department_id", profile.departmentId).order("sort_order"),
    supabase.from("sections").select("id, name, group_id").eq("department_id", profile.departmentId).order("sort_order"),
  ]);
  const studentIds = (students ?? []).map((s) => s.id);
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const sectionName = new Map((sections ?? []).map((s) => [s.id, s.name]));

  const { data: promotions } =
    studentIds.length > 0
      ? await supabase.from("promotions").select("*").in("student_profile_id", studentIds).order("created_at", { ascending: false })
      : { data: [] };

  const promotionIds = (promotions ?? []).map((p) => p.id);
  const { data: vouchers } =
    promotionIds.length > 0
      ? await supabase.from("fee_vouchers").select("*").in("promotion_id", promotionIds)
      : { data: [] };
  const voucherByPromotion = new Map((vouchers ?? []).map((v) => [v.promotion_id, v]));

  const visiblePromotions = (promotions ?? []).filter((p) => !shiftId || studentById.get(p.student_profile_id)?.shift_id === shiftId);
  const hasGroups = (groups ?? []).length > 0;

  return (
    <div className="space-y-6">
      <LiveRefresh table="fee_vouchers" />
      <LiveRefresh table="promotions" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ShiftFilter shifts={shifts ?? []} selectedId={shiftId ?? ""} basePath="/dashboard/focal-person/fees" />
        <CustomVoucherForm
          students={(students ?? []).map((s) => ({ id: s.id, name: s.full_name, registrationNumber: s.registration_number }))}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Student Fee Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Promotion Status</TableHead>
                <TableHead>Shift</TableHead>
                {hasGroups && <TableHead>Group / Section</TableHead>}
                <TableHead>Voucher</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee Status</TableHead>
                <TableHead>Registration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePromotions.map((p) => {
                const voucher = voucherByPromotion.get(p.id);
                const student = studentById.get(p.student_profile_id);
                const registrationEnabled = p.status === "pending_registration" || p.status === "registration_complete" || p.status === "promoted";
                return (
                  <TableRow key={p.id}>
                    <TableCell>{student?.full_name ?? p.student_profile_id}</TableCell>
                    <TableCell className="text-sm text-gray-600">{PROMOTION_STATUS_LABEL[p.status] ?? p.status}</TableCell>
                    <TableCell>
                      {student?.shift_id ? (
                        <Badge variant="outline">{shiftName.get(student.shift_id) ?? "—"}</Badge>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    {hasGroups && (
                      <TableCell>
                        {student?.group_id ? (
                          <span className="text-sm">
                            {groupName.get(student.group_id) ?? "—"}
                            {student.section_id ? ` — ${sectionName.get(student.section_id) ?? "—"}` : ""}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{voucher?.voucher_number ?? "Not generated"}</TableCell>
                    <TableCell>{voucher ? `PKR ${voucher.total_amount.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>{voucher ? <VoucherStatusBadge status={voucher.status} /> : <Badge variant="secondary">Not Generated</Badge>}</TableCell>
                    <TableCell>
                      <Badge variant={registrationEnabled ? "default" : "outline"}>{registrationEnabled ? "Enabled" : "Disabled"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visiblePromotions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={hasGroups ? 8 : 7} className="py-8 text-center text-gray-500">
                    No active promotion cycles yet.
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
