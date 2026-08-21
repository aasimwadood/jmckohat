import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PromotionsView, type PromotionRow } from "@/components/features/promotions/promotions-view";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";
import { CustomVoucherForm } from "@/components/features/fees/custom-voucher-form";
import { fetchAllCollegeStudents } from "@/lib/services/students";

export default async function AdministrationFinancePage() {
  const profile = await requireRole("administration");
  const supabase = await createClient();

  const allStudents = profile.collegeId ? await fetchAllCollegeStudents(supabase, profile.collegeId) : [];

  const [{ data: payments }, { data: scholarships }, { data: vouchers }] = await Promise.all([
    supabase.from("fee_payments").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("scholarships").select("*").order("awarded_at", { ascending: false }),
    supabase.from("fee_vouchers").select("status, total_amount"),
  ]);

  const studentIds = [
    ...new Set([...(payments ?? []).map((p) => p.student_profile_id), ...(scholarships ?? []).map((s) => s.student_profile_id)]),
  ];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  // Promotions still awaiting fee (informational) or ready to finalize once
  // courses are registered — administration only acts on the latter.
  const { data: promotions } = await supabase
    .from("promotions")
    .select("*")
    .in("status", ["fee_pending", "registration_complete"])
    .order("created_at", { ascending: false });
  const promoStudentIds = [...new Set((promotions ?? []).map((p) => p.student_profile_id))];
  const [{ data: promoStudents }, { data: shifts }] = await Promise.all([
    promoStudentIds.length > 0
      ? supabase.from("profiles").select("id, full_name, shift_id").in("id", promoStudentIds)
      : Promise.resolve({ data: [] }),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);
  const promoStudentById = new Map((promoStudents ?? []).map((s) => [s.id, s]));
  const shiftName = new Map((shifts ?? []).map((s) => [s.id, s.name]));
  const promotionRows: PromotionRow[] = (promotions ?? []).map((p) => {
    const student = promoStudentById.get(p.student_profile_id);
    return {
      id: p.id,
      studentName: student?.full_name ?? p.student_profile_id,
      cgpa: p.cgpa,
      academicStanding: p.academic_standing,
      maxCourses: p.max_courses,
      status: p.status,
      registeredCount: 0,
      shiftId: student?.shift_id ?? null,
      shiftName: student?.shift_id ? (shiftName.get(student.shift_id) ?? null) : null,
      groupSectionLabel: null,
    };
  });

  const voucherSummary = (vouchers ?? []).reduce(
    (acc, v) => {
      acc.count[v.status] = (acc.count[v.status] ?? 0) + 1;
      acc.amount[v.status] = (acc.amount[v.status] ?? 0) + v.total_amount;
      return acc;
    },
    { count: {} as Record<string, number>, amount: {} as Record<string, number> },
  );

  return (
    <div className="space-y-6">
      <LiveRefresh table="promotions" />
      <LiveRefresh table="fee_vouchers" />

      <div className="flex justify-end">
        <CustomVoucherForm
          students={allStudents.map((s) => ({ id: s.id, name: s.full_name, registrationNumber: s.registration_number }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semester Fee Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Pending Payment</p>
              <p className="text-2xl font-bold text-gray-900">{voucherSummary.count.unpaid ?? 0}</p>
              <p className="text-xs text-gray-500">PKR {(voucherSummary.amount.unpaid ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">{voucherSummary.count.verified ?? 0}</p>
              <p className="text-xs text-gray-500">PKR {(voucherSummary.amount.verified ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-600">Canceled</p>
              <p className="text-2xl font-bold text-gray-900">{voucherSummary.count.canceled ?? 0}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Upload the daily bank Excel under Bank Import to match and verify pending vouchers.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{studentNames.get(p.student_profile_id) ?? p.student_profile_id}</TableCell>
                  <TableCell className="capitalize">{p.fee_type}</TableCell>
                  <TableCell>PKR {p.amount.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{p.status}</TableCell>
                </TableRow>
              ))}
              {(!payments || payments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scholarships</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(scholarships ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{studentNames.get(s.student_profile_id) ?? s.student_profile_id}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>PKR {s.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {(!scholarships || scholarships.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-gray-500">
                    No scholarships awarded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PromotionsView role="administration" departmentId="" promotions={promotionRows} availableCourses={[]} shifts={shifts ?? []} />
    </div>
  );
}
