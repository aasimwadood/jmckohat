"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { finalizeRecruitmentSelectionAction, issueAppointmentOrderAction } from "@/lib/actions/recruitment";
import type { RecruitmentApplicationStatusEnum } from "@/types/database.types";

type SelectionRow = {
  id: string;
  applicationNumber: string | null;
  applicantName: string;
  status: RecruitmentApplicationStatusEnum;
  finalRank: number | null;
  orderNumber: string | null;
  issuedDate: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  interview_completed: "outline",
  selected: "default",
  waiting_list: "secondary",
  not_selected: "destructive",
  appointment_issued: "default",
};

export function SelectionView({
  positionId,
  positionTitle,
  vacancies,
  applications,
  canIssueAppointments,
}: {
  positionId: string;
  positionTitle: string;
  vacancies: number;
  applications: SelectionRow[];
  canIssueAppointments: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const onFinalize = () => {
    startTransition(async () => {
      const result = await finalizeRecruitmentSelectionAction(positionId);
      if (result?.error) toast.error(result.error);
      else toast.success("Selection finalized");
    });
  };

  const hasInterviewCompleted = applications.some((a) => a.status === "interview_completed");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Selection — {positionTitle}</CardTitle>
          {hasInterviewCompleted && (
            <Button onClick={onFinalize} disabled={isPending} size="sm">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalize Selection"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No candidates have completed interviews yet for this position ({vacancies} vacanc{vacancies === 1 ? "y" : "ies"}).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.finalRank ?? "—"}</TableCell>
                    <TableCell>
                      <p className="font-medium">{app.applicantName}</p>
                      <p className="text-xs text-gray-500">{app.applicationNumber ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[app.status] ?? "outline"} className="capitalize">
                        {app.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {app.orderNumber ? (
                        <div>
                          <p className="text-sm font-medium">{app.orderNumber}</p>
                          <p className="text-xs text-gray-500">{app.issuedDate && new Date(app.issuedDate).toLocaleDateString()}</p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {app.status === "selected" && !app.orderNumber && canIssueAppointments && (
                        <IssueOrderDialog applicationId={app.id} applicantName={app.applicantName} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueOrderDialog({ applicationId, applicantName }: { applicationId: string; applicantName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("applicationId", applicationId);
    startTransition(async () => {
      const result = await issueAppointmentOrderAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Appointment order issued");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Issue Appointment Order</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue Appointment Order — {applicantName}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="officerName">Authorized Officer</Label>
              <Input id="officerName" name="officerName" required />
            </div>
            <div>
              <Label htmlFor="officerTitle">Officer Title</Label>
              <Input id="officerTitle" name="officerTitle" placeholder="e.g. Principal" required />
            </div>
          </div>
          <div>
            <Label htmlFor="joiningDeadline">Joining Deadline</Label>
            <Input id="joiningDeadline" name="joiningDeadline" type="date" />
          </div>
          <div>
            <Label htmlFor="reportingInstructions">Reporting Instructions</Label>
            <Textarea id="reportingInstructions" name="reportingInstructions" rows={2} />
          </div>
          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea id="terms" name="terms" rows={4} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
