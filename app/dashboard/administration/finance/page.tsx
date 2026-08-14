import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PromotionsView, type PromotionRow } from "@/components/features/promotions/promotions-view";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function AdministrationFinancePage() {
  await requireRole("administration");
  const supabase = await createClient();

  const [{ data: payments }, { data: scholarships }] = await Promise.all([
    supabase.from("fee_payments").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("scholarships").select("*").order("awarded_at", { ascending: false }),
  ]);

  const studentIds = [
    ...new Set([...(payments ?? []).map((p) => p.student_profile_id), ...(scholarships ?? []).map((s) => s.student_profile_id)]),
  ];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  const { data: promotions } = await supabase
    .from("promotions")
    .select("*")
    .eq("status", "registration_complete")
    .order("created_at", { ascending: false });
  const promoStudentIds = [...new Set((promotions ?? []).map((p) => p.student_profile_id))];
  const { data: promoStudents } =
    promoStudentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", promoStudentIds) : { data: [] };
  const promoStudentNames = new Map((promoStudents ?? []).map((s) => [s.id, s.full_name]));
  const promotionRows: PromotionRow[] = (promotions ?? []).map((p) => ({
    id: p.id,
    studentName: promoStudentNames.get(p.student_profile_id) ?? p.student_profile_id,
    cgpa: p.cgpa,
    academicStanding: p.academic_standing,
    maxCourses: p.max_courses,
    status: p.status,
    registeredCount: 0,
  }));

  return (
    <div className="space-y-6">
      <LiveRefresh table="promotions" />
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

      <PromotionsView role="administration" departmentId="" promotions={promotionRows} availableCourses={[]} />
    </div>
  );
}
