import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/supabase/storage";
import { RespondToSupervisionButtons } from "./respond-buttons";
import { EvaluationForm } from "./evaluation-form";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function FacultyFypPage() {
  const profile = await requireRole("faculty");
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("fyp_groups")
    .select("*")
    .eq("supervisor_profile_id", profile.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const pending = (groups ?? []).filter((g) => g.status === "supervisor_pending");
  const active = (groups ?? []).filter((g) => g.status !== "supervisor_pending");

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: members } =
    groupIds.length > 0 ? await supabase.from("fyp_members").select("fyp_group_id, student_profile_id").in("fyp_group_id", groupIds) : { data: [] };
  const studentIds = [...new Set((members ?? []).map((m) => m.student_profile_id))];
  const { data: students } =
    studentIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const studentNames = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const membersByGroup = new Map<string, string[]>();
  for (const m of members ?? []) {
    const list = membersByGroup.get(m.fyp_group_id) ?? [];
    list.push(studentNames.get(m.student_profile_id) ?? m.student_profile_id);
    membersByGroup.set(m.fyp_group_id, list);
  }

  const { data: proposals } =
    groupIds.length > 0 ? await supabase.from("fyp_proposals").select("*").in("fyp_group_id", groupIds) : { data: [] };
  const proposalByGroup = new Map((proposals ?? []).map((p) => [p.fyp_group_id, p]));
  const proposalUrls = new Map<string, string | null>();
  for (const p of proposals ?? []) {
    proposalUrls.set(p.fyp_group_id, await getSignedUrl("fyp-deliverables", p.file_path));
  }

  const { data: evaluations } =
    groupIds.length > 0 ? await supabase.from("fyp_evaluations").select("*").in("fyp_group_id", groupIds) : { data: [] };
  const evaluatedGroups = new Set((evaluations ?? []).map((e) => e.fyp_group_id));

  return (
    <div className="space-y-6">
      <LiveRefresh table="fyp_groups" filter={`supervisor_profile_id=eq.${profile.id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Pending Supervision Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && <p className="text-gray-500">No pending requests.</p>}
          {pending.map((group) => (
            <div key={group.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-gray-900">{group.title || "Untitled Project"}</p>
                <p className="text-sm text-gray-500">{(membersByGroup.get(group.id) ?? []).join(", ")}</p>
              </div>
              <RespondToSupervisionButtons groupId={group.id} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups Under Supervision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {active.length === 0 && <p className="text-gray-500">No active groups.</p>}
          {active.map((group) => {
            const proposal = proposalByGroup.get(group.id);
            return (
              <div key={group.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-gray-900">{group.title || "Untitled Project"}</p>
                  <Badge variant="secondary" className="capitalize">
                    {group.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mb-2 text-sm text-gray-500">{(membersByGroup.get(group.id) ?? []).join(", ")}</p>
                {proposal && (
                  <p className="mb-3 text-sm">
                    Proposal:{" "}
                    <a href={proposalUrls.get(group.id) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View file
                    </a>{" "}
                    (status: {proposal.status})
                  </p>
                )}
                <EvaluationForm groupId={group.id} alreadyEvaluated={evaluatedGroups.has(group.id)} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
