import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VerifyFeeDialog } from "./verify-fee-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  fee_approved: "outline",
  admitted: "default",
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

  return (
    <Card>
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
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(admissions ?? []).map((a) => {
              const totalFee =
                a.registration_fee + a.crf_fee + a.admission_fee + a.tuition_fee + a.examination_fee + a.hostel_fee + a.transport_fee;
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
                  <TableCell>{a.status === "pending" && <VerifyFeeDialog admissionId={a.id} applicantName={a.full_name} totalFee={totalFee} />}</TableCell>
                </TableRow>
              );
            })}
            {(!admissions || admissions.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-500">
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
