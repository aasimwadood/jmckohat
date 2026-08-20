import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VoucherStatusBadge } from "@/components/features/fees/voucher-status-badge";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

const PROMOTION_STATUS_LABEL: Record<string, string> = {
  fee_pending: "Awaiting Fee",
  pending_registration: "Fee Cleared — Registration Open",
  registration_complete: "Registered",
  promoted: "Promoted",
};

export default async function FocalPersonFeesPage() {
  const profile = await requireRole("focal_person_intermediate");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("department_id", profile.departmentId)
    .eq("role", "student");
  const studentIds = (students ?? []).map((s) => s.id);
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

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

  return (
    <div className="space-y-6">
      <LiveRefresh table="fee_vouchers" />
      <LiveRefresh table="promotions" />
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
                <TableHead>Voucher</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee Status</TableHead>
                <TableHead>Registration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(promotions ?? []).map((p) => {
                const voucher = voucherByPromotion.get(p.id);
                const registrationEnabled = p.status === "pending_registration" || p.status === "registration_complete" || p.status === "promoted";
                return (
                  <TableRow key={p.id}>
                    <TableCell>{studentNames.get(p.student_profile_id) ?? p.student_profile_id}</TableCell>
                    <TableCell className="text-sm text-gray-600">{PROMOTION_STATUS_LABEL[p.status] ?? p.status}</TableCell>
                    <TableCell>{voucher?.voucher_number ?? "Not generated"}</TableCell>
                    <TableCell>{voucher ? `PKR ${voucher.total_amount.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>{voucher ? <VoucherStatusBadge status={voucher.status} /> : <Badge variant="secondary">Not Generated</Badge>}</TableCell>
                    <TableCell>
                      <Badge variant={registrationEnabled ? "default" : "outline"}>{registrationEnabled ? "Enabled" : "Disabled"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!promotions || promotions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
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
