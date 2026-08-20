import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmImportButton } from "@/components/features/fees/confirm-import-button";
import { ResolveVoucherDialog } from "@/components/features/fees/resolve-voucher-dialog";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

const ROW_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  valid: "secondary",
  invalid: "destructive",
  matched: "default",
  amount_mismatch: "destructive",
  unmatched: "outline",
  duplicate_row: "destructive",
};

export default async function BankImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("administration", "admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: imp } = await supabase.from("fee_bank_imports").select("*").eq("id", id).single();
  if (!imp) notFound();

  const { data: rows } = await supabase.from("fee_bank_import_rows").select("*").eq("import_id", id).order("row_number");

  const voucherNumbers = [...new Set((rows ?? []).map((r) => r.voucher_number).filter((v): v is string => !!v))];
  const { data: vouchers } =
    voucherNumbers.length > 0
      ? await supabase.from("fee_vouchers").select("id, voucher_number, status, total_amount").in("voucher_number", voucherNumbers)
      : { data: [] };
  const voucherByNumber = new Map((vouchers ?? []).map((v) => [v.voucher_number, v]));

  const summary = [
    { label: "Total Rows", value: imp.total_rows },
    { label: "Valid", value: imp.valid_rows },
    { label: "Invalid", value: imp.invalid_rows },
    { label: "Duplicate", value: imp.duplicate_rows },
    { label: "Matched", value: imp.matched_rows },
    { label: "Mismatched", value: imp.mismatched_rows },
    { label: "Unmatched", value: imp.unmatched_rows },
  ];

  return (
    <div className="space-y-6">
      <LiveRefresh table="fee_bank_imports" filter={`id=eq.${id}`} />
      <LiveRefresh table="fee_bank_import_rows" filter={`import_id=eq.${id}`} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{imp.original_filename}</CardTitle>
            {imp.status === "previewed" && <ConfirmImportButton importId={imp.id} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {summary.map((s) => (
              <div key={s.label} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rows</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((row) => {
                const voucher = row.voucher_number ? voucherByNumber.get(row.voucher_number) : undefined;
                const needsResolution =
                  imp.status === "completed" &&
                  (row.status === "amount_mismatch" || row.status === "unmatched") &&
                  voucher &&
                  voucher.status === "unpaid";
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.row_number}</TableCell>
                    <TableCell>{row.voucher_number ?? "—"}</TableCell>
                    <TableCell>{row.student_identifier ?? "—"}</TableCell>
                    <TableCell>{row.amount !== null ? `PKR ${row.amount.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>{row.transaction_reference ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={ROW_STATUS_VARIANT[row.status] ?? "secondary"} className="capitalize">
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{row.error_message ?? "—"}</TableCell>
                    <TableCell>{needsResolution && voucher && <ResolveVoucherDialog voucherId={voucher.id} voucherNumber={voucher.voucher_number} />}</TableCell>
                  </TableRow>
                );
              })}
              {(!rows || rows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                    No rows in this import.
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
