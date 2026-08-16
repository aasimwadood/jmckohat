import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FypConfigRow } from "@/components/features/fyp/fyp-config-row";

export default async function DepartmentFypPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  if (!profile.departmentId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your department is not configured yet.</CardContent>
      </Card>
    );
  }

  const [{ data: semesters }, { data: configs }, { data: students }] = await Promise.all([
    supabase.from("semesters").select("id, number").order("number"),
    supabase.from("fyp_semester_config").select("*").eq("department_id", profile.departmentId),
    supabase.from("profiles").select("current_semester_id, batch").eq("department_id", profile.departmentId).eq("role", "student"),
  ]);

  const configBySemester = new Map((configs ?? []).map((c) => [c.semester_id, c]));
  const batchesBySemester = new Map<string, Set<string>>();
  for (const s of students ?? []) {
    if (!s.current_semester_id || !s.batch) continue;
    const set = batchesBySemester.get(s.current_semester_id) ?? new Set<string>();
    set.add(s.batch);
    batchesBySemester.set(s.current_semester_id, set);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Year Project — Semester Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Enable FYP for the semester your final-year batch is currently in — students in that semester can then form
          a group, pick a supervisor, and submit a title. Disabled semesters can&apos;t start a new group.
        </p>
        {(semesters ?? []).map((s) => {
          const config = configBySemester.get(s.id);
          const batches = [...(batchesBySemester.get(s.id) ?? [])].sort().reverse();
          return (
            <FypConfigRow
              key={s.id}
              semesterId={s.id}
              semesterNumber={s.number}
              batches={batches}
              config={{
                isEnabled: config?.is_enabled ?? false,
                maxMembers: config?.max_members ?? 3,
                supervisorQuota: config?.supervisor_quota ?? 3,
                proposalDeadline: config?.proposal_deadline ?? null,
                midSemesterDeadline: config?.mid_semester_deadline ?? null,
                finalDeadline: config?.final_deadline ?? null,
              }}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
