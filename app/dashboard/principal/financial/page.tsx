import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PrincipalFinancialPage() {
  await requireRole("principal");
  const supabase = await createClient();

  const [{ data: fees }, { data: scholarships }, { data: departments }, { data: students }] = await Promise.all([
    supabase.from("fee_payments").select("amount, status, student_profile_id"),
    supabase.from("scholarships").select("amount"),
    supabase.from("departments").select("id, name"),
    supabase.from("profiles").select("id, department_id").eq("role", "student"),
  ]);

  const totalCollected = (fees ?? []).filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const totalOutstanding = (fees ?? []).filter((f) => f.status === "pending").reduce((s, f) => s + f.amount, 0);
  const totalScholarships = (scholarships ?? []).reduce((s, sc) => s + sc.amount, 0);

  const studentDept = new Map((students ?? []).map((s) => [s.id, s.department_id]));
  const feesByDept = new Map<string, { collected: number; outstanding: number }>();
  for (const f of fees ?? []) {
    const deptId = studentDept.get(f.student_profile_id);
    if (!deptId) continue;
    const entry = feesByDept.get(deptId) ?? { collected: 0, outstanding: 0 };
    if (f.status === "paid") entry.collected += f.amount;
    else entry.outstanding += f.amount;
    feesByDept.set(deptId, entry);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Fee Collected</p>
            <p className="text-2xl font-bold text-gray-900">PKR {totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900">PKR {totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Scholarships Awarded</p>
            <p className="text-2xl font-bold text-gray-900">PKR {totalScholarships.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department-wise Fee Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(departments ?? []).map((d) => {
                const stats = feesByDept.get(d.id);
                return (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>PKR {(stats?.collected ?? 0).toLocaleString()}</TableCell>
                    <TableCell>PKR {(stats?.outstanding ?? 0).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
