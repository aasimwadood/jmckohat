import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BankImportUploadForm } from "@/components/features/fees/bank-import-upload-form";

export default async function BankImportPage() {
  await requireRole("administration", "admin");
  const supabase = await createClient();

  const { data: imports } = await supabase
    .from("fee_bank_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <BankImportUploadForm />
          <p className="mt-3 text-xs text-gray-500">
            Expected columns: Voucher Number, Student ID, Amount Paid, Transaction Date, Transaction Reference.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(imports ?? []).map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell>
                    <Link href={`/dashboard/administration/finance/import/${imp.id}`} className="text-blue-600 hover:underline">
                      {imp.original_filename}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(imp.created_at).toLocaleString()}</TableCell>
                  <TableCell>{imp.total_rows}</TableCell>
                  <TableCell>{imp.matched_rows}</TableCell>
                  <TableCell>
                    <Badge variant={imp.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {imp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!imports || imports.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No bank files uploaded yet.
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
