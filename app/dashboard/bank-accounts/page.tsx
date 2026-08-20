import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BankAccountForm } from "@/components/features/fees/bank-account-form";
import { DeleteBankAccountButton } from "@/components/features/fees/delete-bank-account-button";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function BankAccountsPage() {
  const profile = await requireRole("admin", "principal", "administration");
  const supabase = await createClient();

  const [{ data: accounts }, { data: shifts }] = profile.collegeId
    ? await Promise.all([
        supabase.from("college_bank_accounts").select("*").eq("college_id", profile.collegeId).order("sort_order"),
        supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order"),
      ])
    : [{ data: [] }, { data: [] }];

  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <LiveRefresh table="college_bank_accounts" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Accounts</CardTitle>
              <p className="mt-1 text-sm text-gray-500">Printed on every student&apos;s fee voucher — add every account the college accepts payment into.</p>
            </div>
            <BankAccountForm shifts={shifts ?? []} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Account Title</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(accounts ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.bank_name}</TableCell>
                  <TableCell>{a.account_title ?? "—"}</TableCell>
                  <TableCell>{a.account_number}</TableCell>
                  <TableCell>{a.shift_id ? (shiftName.get(a.shift_id) ?? "—") : "General (all shifts)"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <BankAccountForm
                        initial={{ id: a.id, bankName: a.bank_name, accountTitle: a.account_title, accountNumber: a.account_number, shiftId: a.shift_id }}
                        shifts={shifts ?? []}
                      />
                      <DeleteBankAccountButton id={a.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!accounts || accounts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No bank accounts configured yet — vouchers will print without a payment account until one is added.
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
