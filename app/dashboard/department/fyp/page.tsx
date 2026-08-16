import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FypBatchConfig } from "@/components/features/fyp/fyp-batch-config";

// FYP is only ever relevant to a batch in its final semesters — a fresh
// semester-2 batch can't start one. Restricting the picker to semester 6+
// (the last 3 of an 8-semester BS program) keeps the list to the batches
// that could actually need this, instead of showing all 8 semesters.
const FINAL_SEMESTER_THRESHOLD = 6;

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

  const semesterNumberById = new Map((semesters ?? []).map((s) => [s.id, s.number]));
  const configBySemester = new Map((configs ?? []).map((c) => [c.semester_id, c]));

  // One entry per batch, keeping whichever semester most of that batch's
  // students are actually in (a batch should be uniform, but this is
  // resilient if a handful of repeat students lag behind).
  const semesterCountsByBatch = new Map<string, Map<string, number>>();
  for (const s of students ?? []) {
    if (!s.batch || !s.current_semester_id) continue;
    const counts = semesterCountsByBatch.get(s.batch) ?? new Map<string, number>();
    counts.set(s.current_semester_id, (counts.get(s.current_semester_id) ?? 0) + 1);
    semesterCountsByBatch.set(s.batch, counts);
  }

  const entries = [...semesterCountsByBatch.entries()]
    .map(([batch, counts]) => {
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const semesterId = top?.[0] ?? "";
      return { batch, semesterId, semesterNumber: semesterNumberById.get(semesterId) ?? 0 };
    })
    .filter((e) => e.semesterId && e.semesterNumber >= FINAL_SEMESTER_THRESHOLD)
    .sort((a, b) => b.semesterNumber - a.semesterNumber || b.batch.localeCompare(a.batch))
    .map((e) => {
      const config = configBySemester.get(e.semesterId);
      return {
        ...e,
        config: {
          isEnabled: config?.is_enabled ?? false,
          maxMembers: config?.max_members ?? 3,
          supervisorQuota: config?.supervisor_quota ?? 3,
          proposalDeadline: config?.proposal_deadline ?? null,
          midSemesterDeadline: config?.mid_semester_deadline ?? null,
          finalDeadline: config?.final_deadline ?? null,
        },
      };
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Year Project — Batch Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-gray-600">
          Pick the batch that&apos;s doing its Final Year Project and enable FYP for the semester they&apos;re
          currently in — students can then form a group, pick a supervisor, and submit a title. Only batches in their
          final semesters show up here.
        </p>
        <FypBatchConfig entries={entries} />
      </CardContent>
    </Card>
  );
}
