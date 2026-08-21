import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StudentsRosterView, type StudentRow } from "@/components/features/students/students-roster-view";
import { DepartmentPicker } from "@/components/features/students/department-picker";
import type { Database } from "@/types/database.types";

// Same >1000-row PostgREST page-size cap department/enrollments/page.tsx
// already documents (real for Computer Science today) — paged defensively
// here too.
const PAGE_SIZE = 1000;

async function fetchAllStudents(supabase: SupabaseClient<Database>, departmentId: string) {
  const rows: { id: string; full_name: string; username: string; batch: string | null; shift_id: string | null; group_id: string | null; section_id: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, batch, shift_id, group_id, section_id")
      .eq("department_id", departmentId)
      .eq("role", "student")
      .order("full_name")
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ departmentId?: string }> }) {
  const profile = await requireRole("admin", "principal", "department", "focal_person_intermediate");
  const supabase = await createClient();

  // department/focal_person_intermediate always manage their own roster;
  // admin/principal have no department of their own, so they pick one.
  let departmentId = profile.departmentId;
  let departmentPicker: React.ReactNode = null;

  if (!departmentId) {
    const { data: departments } = profile.collegeId
      ? await supabase.from("departments").select("id, name").eq("college_id", profile.collegeId).order("name")
      : { data: [] };
    const params = await searchParams;
    departmentId = params.departmentId ?? null;
    departmentPicker = <DepartmentPicker departments={departments ?? []} selectedId={departmentId ?? ""} />;
  }

  if (!departmentId) {
    return (
      <div className="space-y-6">
        {departmentPicker}
        <Card>
          <CardContent className="py-8 text-center text-gray-500">Select a department to view its students.</CardContent>
        </Card>
      </div>
    );
  }

  const [students, { data: shifts }, { data: groups }, { data: sections }] = await Promise.all([
    fetchAllStudents(supabase, departmentId),
    profile.collegeId
      ? supabase.from("shifts").select("id, name").eq("college_id", profile.collegeId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("groups").select("id, name").eq("department_id", departmentId).order("sort_order"),
    supabase.from("sections").select("id, name, group_id").eq("department_id", departmentId).order("sort_order"),
  ]);

  const rows: StudentRow[] = students.map((s) => ({
    id: s.id,
    name: s.full_name,
    username: s.username,
    batch: s.batch,
    shiftId: s.shift_id,
    groupId: s.group_id,
    sectionId: s.section_id,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href="/dashboard/students/import">
            <Upload className="mr-2 h-4 w-4" />
            Import from CSV
          </Link>
        </Button>
      </div>
      {departmentPicker}
      <StudentsRosterView
        students={rows}
        shifts={shifts ?? []}
        groups={groups ?? []}
        sections={(sections ?? []).map((s) => ({ id: s.id, name: s.name, groupId: s.group_id }))}
      />
    </div>
  );
}
