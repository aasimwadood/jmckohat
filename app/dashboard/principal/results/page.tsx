import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { letterGrade } from "@/lib/utils/grading";

export default async function PrincipalResultsPage() {
  await requireRole("principal");
  const supabase = await createClient();

  const [{ data: departments }, { data: courses }, { data: results }] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("courses").select("id, department_id"),
    supabase.from("results").select("student_profile_id, course_id, total"),
  ]);

  const courseDept = new Map((courses ?? []).map((c) => [c.id, c.department_id]));
  const resultsByDept = new Map<string, { student_profile_id: string; total: number }[]>();
  for (const r of results ?? []) {
    const deptId = courseDept.get(r.course_id);
    if (!deptId) continue;
    const list = resultsByDept.get(deptId) ?? [];
    list.push(r);
    resultsByDept.set(deptId, list);
  }

  const topperIds = new Set<string>();
  const topperByDept = new Map<string, { student_profile_id: string; total: number } | null>();
  for (const [deptId, list] of resultsByDept) {
    const top = list.reduce((best, r) => (r.total > (best?.total ?? -1) ? r : best), null as { student_profile_id: string; total: number } | null);
    topperByDept.set(deptId, top);
    if (top) topperIds.add(top.student_profile_id);
  }
  const { data: toppers } =
    topperIds.size > 0 ? await supabase.from("profiles").select("id, full_name").in("id", [...topperIds]) : { data: [] };
  const topperNames = new Map((toppers ?? []).map((t) => [t.id, t.full_name]));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {(departments ?? []).map((d) => {
        const list = resultsByDept.get(d.id) ?? [];
        const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        for (const r of list) gradeCounts[letterGrade(r.total)] = (gradeCounts[letterGrade(r.total)] ?? 0) + 1;
        const topper = topperByDept.get(d.id);

        return (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle>{d.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {Object.entries(gradeCounts).map(([grade, count]) => (
                  <div key={grade} className="rounded border p-2">
                    <p className="font-bold">{count}</p>
                    <p className="text-xs text-gray-500">{grade}</p>
                  </div>
                ))}
              </div>
              {topper && (
                <Badge variant="default">
                  Topper: {topperNames.get(topper.student_profile_id) ?? "—"} ({topper.total})
                </Badge>
              )}
              {list.length === 0 && <p className="text-sm text-gray-500">No results recorded yet.</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
