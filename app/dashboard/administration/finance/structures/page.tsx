import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FeeStructureForm } from "@/components/features/fees/fee-structure-form";
import { semesterLabel } from "@/lib/utils/degree-level";

export default async function FeeStructuresPage() {
  await requireRole("admin", "principal");
  const supabase = await createClient();

  const [{ data: programs }, { data: departments }, { data: academicSessions }, { data: structures }] = await Promise.all([
    supabase.from("programs").select("id, name, department_id, degree_level").order("name"),
    supabase.from("departments").select("id, name"),
    supabase.from("academic_sessions").select("id, label").order("label", { ascending: false }),
    supabase.from("fee_structures").select("*").order("created_at", { ascending: false }),
  ]);

  const structureIds = (structures ?? []).map((s) => s.id);
  const { data: allComponents } =
    structureIds.length > 0
      ? await supabase.from("fee_structure_components").select("*").in("fee_structure_id", structureIds).order("sort_order")
      : { data: [] };
  const componentsByStructure = new Map<string, { name: string; amount: number; sort_order: number }[]>();
  for (const c of allComponents ?? []) {
    const list = componentsByStructure.get(c.fee_structure_id) ?? [];
    list.push({ name: c.name, amount: c.amount, sort_order: c.sort_order });
    componentsByStructure.set(c.fee_structure_id, list);
  }

  const departmentName = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const programOptions = (programs ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    departmentName: departmentName.get(p.department_id) ?? "—",
    degreeLevel: p.degree_level,
  }));
  const programName = new Map(programOptions.map((p) => [p.id, `${p.name} (${p.departmentName})`]));
  const programDegreeLevel = new Map(programOptions.map((p) => [p.id, p.degreeLevel]));
  const sessionLabel = new Map((academicSessions ?? []).map((s) => [s.id, s.label]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Structures</CardTitle>
            <FeeStructureForm
              programs={programOptions}
              academicSessions={academicSessions ?? []}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Structure
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Components</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(structures ?? []).map((s) => {
                const components = componentsByStructure.get(s.id) ?? [];
                return (
                  <TableRow key={s.id}>
                    <TableCell>{programName.get(s.program_id) ?? s.program_id}</TableCell>
                    <TableCell>{semesterLabel(s.semester_number, programDegreeLevel.get(s.program_id))}</TableCell>
                    <TableCell>{sessionLabel.get(s.academic_session_id) ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{components.map((c) => c.name).join(", ")}</TableCell>
                    <TableCell>PKR {s.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{s.status}</TableCell>
                    <TableCell>
                      <FeeStructureForm
                        programs={programOptions}
                        academicSessions={academicSessions ?? []}
                        initial={{
                          programId: s.program_id,
                          semesterNumber: s.semester_number,
                          academicSessionId: s.academic_session_id,
                          components: components.map((c) => ({ name: c.name, amount: String(c.amount) })),
                        }}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!structures || structures.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No fee structures configured yet.
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
