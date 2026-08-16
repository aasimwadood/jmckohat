import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/supabase/storage";
import { CreateFypGroupDialog } from "./create-group-dialog";
import { UploadProposalForm, UploadDeliverableForm } from "./upload-forms";
import { WithdrawGroupButton } from "./withdraw-group-button";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function StudentFypPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("fyp_members")
    .select("fyp_group_id")
    .eq("student_profile_id", profile.id);

  const groupIds = (membership ?? []).map((m) => m.fyp_group_id);
  const { data: groups } =
    groupIds.length > 0
      ? await supabase.from("fyp_groups").select("*").in("id", groupIds).order("created_at", { ascending: false })
      : { data: [] };

  const activeGroup = (groups ?? []).find((g) => g.status !== "archived") ?? null;

  if (!activeGroup) {
    if (!profile.departmentId || !profile.currentSemesterId) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Your department/semester isn&apos;t set up yet — contact your department for FYP enrollment.
          </CardContent>
        </Card>
      );
    }

    const { data: config } = await supabase
      .from("fyp_semester_config")
      .select("*")
      .eq("department_id", profile.departmentId)
      .eq("semester_id", profile.currentSemesterId)
      .single();

    if (!config || !config.is_enabled) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            FYP has not been enabled for your department this semester yet.
          </CardContent>
        </Card>
      );
    }

    const [{ data: classmates }, { data: supervisors }, { data: existingGroups }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("department_id", profile.departmentId)
        .eq("role", "student")
        .neq("id", profile.id),
      supabase.from("profiles").select("id, full_name").eq("department_id", profile.departmentId).eq("role", "faculty"),
      supabase
        .from("fyp_groups")
        .select("supervisor_profile_id")
        .eq("semester_id", profile.currentSemesterId)
        .neq("status", "archived"),
    ]);

    const assignedCounts = new Map<string, number>();
    for (const g of existingGroups ?? []) {
      if (!g.supervisor_profile_id) continue;
      assignedCounts.set(g.supervisor_profile_id, (assignedCounts.get(g.supervisor_profile_id) ?? 0) + 1);
    }
    const availableSupervisors = (supervisors ?? []).filter(
      (s) => (assignedCounts.get(s.id) ?? 0) < config.supervisor_quota,
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Final Year Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">
            You&apos;re not part of an FYP group yet. Form a group with up to {config.max_members} classmates and select
            a supervisor.
          </p>
          <CreateFypGroupDialog
            departmentId={profile.departmentId}
            semesterId={profile.currentSemesterId}
            maxMembers={config.max_members}
            classmates={classmates ?? []}
            supervisors={availableSupervisors}
          />
        </CardContent>
      </Card>
    );
  }

  const [{ data: members }, { data: supervisor }, { data: proposals }, { data: deliverables }, { data: evaluations }] =
    await Promise.all([
      supabase.from("fyp_members").select("student_profile_id, is_leader").eq("fyp_group_id", activeGroup.id),
      activeGroup.supervisor_profile_id
        ? supabase.from("profiles").select("full_name").eq("id", activeGroup.supervisor_profile_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("fyp_proposals").select("*").eq("fyp_group_id", activeGroup.id).order("submitted_at", { ascending: false }),
      supabase.from("fyp_deliverables").select("*").eq("fyp_group_id", activeGroup.id).order("submitted_at", { ascending: false }),
      supabase.from("fyp_evaluations").select("*").eq("fyp_group_id", activeGroup.id),
    ]);

  const memberIds = (members ?? []).map((m) => m.student_profile_id);
  const { data: memberProfiles } =
    memberIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", memberIds) : { data: [] };
  const memberNames = new Map((memberProfiles ?? []).map((p) => [p.id, p.full_name]));

  const latestProposal = proposals?.[0] ?? null;
  const proposalUrl = latestProposal ? await getSignedUrl("fyp-deliverables", latestProposal.file_path) : null;

  const deliverableUrls = new Map<string, string | null>();
  for (const d of deliverables ?? []) {
    deliverableUrls.set(d.id, await getSignedUrl("fyp-deliverables", d.file_path));
  }

  return (
    <div className="space-y-6">
      <LiveRefresh table="fyp_groups" filter={`id=eq.${activeGroup.id}`} />
      <LiveRefresh table="fyp_proposals" filter={`fyp_group_id=eq.${activeGroup.id}`} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{activeGroup.title || "Final Year Project"}</span>
            <Badge variant="secondary" className="capitalize">
              {activeGroup.status.replace(/_/g, " ")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            Supervisor: <span className="text-gray-900">{supervisor?.full_name ?? "Pending approval"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Members:{" "}
            <span className="text-gray-900">
              {(members ?? []).map((m) => memberNames.get(m.student_profile_id) ?? m.student_profile_id).join(", ")}
            </span>
          </p>
        </CardContent>
      </Card>

      {activeGroup.status === "supervisor_pending" && (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            {activeGroup.supervisor_profile_id ? (
              <p className="text-gray-500">Waiting for your supervisor to approve this group.</p>
            ) : (
              <>
                <p className="text-gray-500">
                  Your previous supervisor declined this group. You can withdraw and form a new one.
                </p>
                <WithdrawGroupButton groupId={activeGroup.id} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeGroup.status === "proposal_pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Proposal</CardTitle>
          </CardHeader>
          <CardContent>
            {latestProposal ? (
              <p className="text-sm text-gray-600">
                Proposal submitted, status: <span className="capitalize">{latestProposal.status}</span>.{" "}
                {proposalUrl && (
                  <a href={proposalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View file
                  </a>
                )}
              </p>
            ) : (
              <UploadProposalForm groupId={activeGroup.id} />
            )}
          </CardContent>
        </Card>
      )}

      {["in_progress", "mid_semester_review", "final_submission", "completed"].includes(activeGroup.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadDeliverableForm groupId={activeGroup.id} />
            <div className="space-y-2">
              {(deliverables ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="capitalize">{d.type.replace(/_/g, " ")}</span>
                  <span className="text-gray-500">{new Date(d.submitted_at).toLocaleDateString()}</span>
                  {deliverableUrls.get(d.id) && (
                    <a href={deliverableUrls.get(d.id)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View
                    </a>
                  )}
                </div>
              ))}
              {(!deliverables || deliverables.length === 0) && <p className="text-gray-500">No deliverables submitted yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {evaluations && evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evaluations.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="capitalize">{e.criterion.replace(/_/g, " ")}</span>
                <span className="text-gray-900">
                  {e.score}/{e.max_score}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
