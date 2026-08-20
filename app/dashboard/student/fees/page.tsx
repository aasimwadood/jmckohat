import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { GenerateFeeButton } from "@/components/features/fees/generate-fee-button";
import { VoucherStatusBadge } from "@/components/features/fees/voucher-status-badge";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function StudentFeesPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const [{ data: fees }, { data: promotions }, { data: vouchers }] = await Promise.all([
    supabase.from("fee_payments").select("*").eq("student_profile_id", profile.id).order("created_at", { ascending: false }),
    supabase
      .from("promotions")
      .select("id, status, to_semester_id")
      .eq("student_profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("fee_vouchers")
      .select("*")
      .eq("student_profile_id", profile.id)
      .order("generated_at", { ascending: false }),
  ]);

  const pending = (fees ?? []).filter((f) => f.status === "pending");
  const paid = (fees ?? []).filter((f) => f.status === "paid");

  const voucherByPromotion = new Map((vouchers ?? []).map((v) => [v.promotion_id, v]));
  const awaitingVoucher = (promotions ?? []).find((p) => p.status === "fee_pending" && !voucherByPromotion.has(p.id));

  return (
    <div className="space-y-6">
      <LiveRefresh table="fee_vouchers" filter={`student_profile_id=eq.${profile.id}`} />
      <LiveRefresh table="promotions" filter={`student_profile_id=eq.${profile.id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Current Semester Fee</CardTitle>
        </CardHeader>
        <CardContent>
          {awaitingVoucher ? (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
              <div>
                <p className="font-semibold text-gray-900">Fee voucher not generated yet</p>
                <p className="text-sm text-gray-600">You&apos;ve been promoted to a new semester — generate your fee voucher to proceed.</p>
              </div>
              <GenerateFeeButton promotionId={awaitingVoucher.id} />
            </div>
          ) : vouchers && vouchers.length > 0 ? (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-semibold text-gray-900">Voucher {v.voucher_number}</p>
                    <p className="text-sm text-gray-600">
                      Amount: PKR {v.total_amount.toLocaleString()} · Due {new Date(v.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <VoucherStatusBadge status={v.status} />
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/fees/vouchers/${v.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-4 w-4" />
                        Voucher
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">No fee vouchers yet — one is generated automatically after each promotion.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pending.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between rounded-lg bg-orange-50 p-4">
                <div>
                  <p className="font-semibold text-gray-900 capitalize">{fee.fee_type} Fee</p>
                  {fee.due_date && <p className="text-sm text-gray-600">Due: {fee.due_date}</p>}
                  <p className="mt-1 text-gray-900">Amount: PKR {fee.amount.toLocaleString()}</p>
                </div>
                <p className="text-sm text-gray-500">Pay via bank challan — see Fee Structure page</p>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-green-800">All other fees are currently up to date.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paid.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Verified</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paid.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="capitalize">{payment.fee_type}</TableCell>
                    <TableCell>PKR {payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{payment.verified_at ? new Date(payment.verified_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/fees/receipt/${payment.id}`} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
