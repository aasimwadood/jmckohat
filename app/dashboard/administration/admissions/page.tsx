import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VerifyFeeDialog } from "./verify-fee-dialog";
import { ManuallyClearAdmissionFeeDialog } from "./manually-clear-admission-fee-dialog";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  fee_approved: "outline",
  admitted: "default",
  canceled: "destructive",
};

const VOUCHER_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  unpaid: "secondary",
  verified: "default",
  canceled: "destructive",
};

export default async function AdministrationAdmissionsPage() {
  await requireRole("administration");
  const supabase = await createClient();

  const { data: admissions } = await supabase
    .from("admissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const departmentIds = [...new Set((admissions ?? []).map((a) => a.department_id))];
  const { data: departments } =
    departmentIds.length > 0 ? await supabase.from("departments").select("id, name").in("id", departmentIds) : { data: [] };
  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));

  const admissionIds = (admissions ?? []).map((a) => a.id);
  const { data: vouchers } =
    admissionIds.length > 0
      ? await supabase.from("fee_vouchers").select("id, admission_id, voucher_number, status").in("admission_id", admissionIds)
      : { data: [] };
  const voucherByAdmission = new Map((vouchers ?? []).map((v) => [v.admission_id, v]));

  return (
    <Card>
      <LiveRefresh table="admissions" />
      <LiveRefresh table="fee_vouchers" />
      <CardHeader>
        <CardTitle>Admissions — Fee Verification</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Fee</TableHead>
              <TableHead>Fee Voucher</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(admissions ?? []).map((a) => {
              const totalFee =
                a.registration_fee + a.crf_fee + a.admission_fee + a.tuition_fee + a.examination_fee + a.hostel_fee + a.transport_fee;
              const voucher = voucherByAdmission.get(a.id);
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="font-medium">{a.full_name}</p>
                    <p className="text-xs text-gray-500">{a.email ?? a.temporary_id}</p>
                  </TableCell>
                  <TableCell>{departmentNames.get(a.department_id)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[a.status]} className="capitalize">
                      {a.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>PKR {totalFee.toLocaleString()}</TableCell>
                  <TableCell>
                    {voucher ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={VOUCHER_STATUS_VARIANT[voucher.status]} className="capitalize">
                          {voucher.status}
                        </Badge>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/fees/vouchers/${voucher.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not generated</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {a.status === "pending" && !voucher && (
                        <VerifyFeeDialog admissionId={a.id} applicantName={a.full_name} totalFee={totalFee} />
                      )}
                      {a.status === "pending" && voucher && voucher.status === "unpaid" && (
                        <ManuallyClearAdmissionFeeDialog admissionId={a.id} applicantName={a.full_name} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!admissions || admissions.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No admission records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
