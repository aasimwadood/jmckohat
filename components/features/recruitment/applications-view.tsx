"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  scrutinizeApplicationAction,
  verifyDocumentAction,
  enterMeritScoreAction,
  shortlistCandidatesAction,
  getStaffApplicationDocumentsAction,
  type StaffApplicationDocumentRow,
} from "@/lib/actions/recruitment";
import type { ApplicationRow, MeritCriterionRow, RequiredDocumentRow } from "./types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "secondary",
  under_scrutiny: "secondary",
  eligible: "default",
  ineligible: "destructive",
  shortlisted: "default",
  interview_scheduled: "default",
  interview_completed: "default",
  selected: "default",
  waiting_list: "secondary",
  not_selected: "destructive",
  appointment_issued: "default",
  rejected: "destructive",
  withdrawn: "outline",
};

export function ApplicationsView({
  positionId,
  positionTitle,
  applications,
  criteria,
  requiredDocuments,
}: {
  positionId: string;
  positionTitle: string;
  applications: ApplicationRow[];
  criteria: MeritCriterionRow[];
  requiredDocuments: RequiredDocumentRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const eligibleApps = applications.filter((a) => a.status === "eligible");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onShortlist = () => {
    const formData = new FormData();
    formData.set("positionId", positionId);
    selected.forEach((id) => formData.append("applicationIds", id));
    startTransition(async () => {
      const result = await shortlistCandidatesAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Candidates shortlisted");
        setSelected(new Set());
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Applications — {positionTitle}</CardTitle>
          {selected.size > 0 && (
            <Button onClick={onShortlist} disabled={isPending} size="sm">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Shortlist ${selected.size} Selected`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No applications submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Applicant</TableHead>
                  <TableHead>Application #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Merit</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      {app.status === "eligible" && (
                        <Checkbox checked={selected.has(app.id)} onCheckedChange={() => toggle(app.id)} />
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{app.applicantName}</p>
                      <p className="text-xs text-gray-500">{app.applicantEmail}</p>
                    </TableCell>
                    <TableCell>{app.applicationNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[app.status] ?? "outline"} className="capitalize">
                        {app.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{app.meritTotal ?? "—"}</TableCell>
                    <TableCell>
                      <ReviewDialog application={app} criteria={criteria} requiredDocuments={requiredDocuments} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {eligibleApps.length === 0 && applications.length > 0 && (
          <p className="mt-3 text-xs text-gray-500">Mark candidates eligible during scrutiny to enable shortlisting.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewDialog({
  application,
  criteria,
  requiredDocuments,
}: {
  application: ApplicationRow;
  criteria: MeritCriterionRow[];
  requiredDocuments: RequiredDocumentRow[];
}) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<StaffApplicationDocumentRow[] | null>(null);

  useEffect(() => {
    if (open) {
      getStaffApplicationDocumentsAction(application.id).then(setDocuments);
    }
  }, [open, application.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Review
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{application.applicantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            <p>{application.applicantEmail}</p>
            {application.qualification && <p>Qualification: {application.qualification}</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-900">Documents</p>
            {documents === null ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <ul className="space-y-2">
                {requiredDocuments.map((rd) => {
                  const doc = documents.find((d) => d.documentType === rd.documentType);
                  return (
                    <li key={rd.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{rd.documentType}</span>
                        {rd.isMandatory && <span className="ml-1 text-xs text-red-600">*</span>}
                        {doc?.url && (
                          <a href={doc.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-blue-600 hover:underline">
                            View <ExternalLink className="ml-0.5 h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {doc ? (
                        <DocumentVerifyControl documentId={doc.id} status={doc.status} />
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <ScrutinyForm application={application} />

          {criteria.length > 0 && <MeritScoresForm applicationId={application.id} criteria={criteria} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentVerifyControl({ documentId, status }: { documentId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("status", value);
    startTransition(async () => {
      const result = await verifyDocumentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Document status updated");
    });
  };

  return (
    <Select defaultValue={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-32 capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="verified">Verified</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
        <SelectItem value="not_required">Not Required</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ScrutinyForm({ application }: { application: ApplicationRow }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("applicationId", application.id);
    startTransition(async () => {
      const result = await scrutinizeApplicationAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Scrutiny recorded");
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-900">Scrutiny</p>
      <form action={onSubmit} className="space-y-2">
        <Select name="eligibilityStatus" defaultValue={application.eligibilityStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="eligible">Eligible</SelectItem>
            <SelectItem value="ineligible">Ineligible</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          name="remarks"
          placeholder="Remarks (required if overriding unverified mandatory documents)"
          defaultValue={application.scrutinyRemarks ?? ""}
          rows={2}
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Scrutiny"}
        </Button>
      </form>
    </div>
  );
}

function MeritScoresForm({ applicationId, criteria }: { applicationId: string; criteria: MeritCriterionRow[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-900">Merit Scores</p>
      <div className="space-y-2">
        {criteria.map((c) => (
          <MeritScoreRow key={c.id} applicationId={applicationId} criterion={c} />
        ))}
      </div>
    </div>
  );
}

function MeritScoreRow({ applicationId, criterion }: { applicationId: string; criterion: MeritCriterionRow }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("applicationId", applicationId);
    formData.set("criterionId", criterion.id);
    startTransition(async () => {
      const result = await enterMeritScoreAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`${criterion.name} score saved`);
    });
  };

  return (
    <form action={onSubmit} className="flex items-center gap-2">
      <Label className="w-32 text-sm">{criterion.name}</Label>
      <Input name="score" type="number" min={0} max={criterion.maxScore} step="0.5" className="w-24" required />
      <span className="text-xs text-gray-500">/ {criterion.maxScore}</span>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
    </form>
  );
}
