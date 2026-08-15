"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  scheduleInterviewAction,
  enterInterviewMarksAction,
  finalizeInterviewMarksAction,
  reopenInterviewMarksAction,
} from "@/lib/actions/recruitment";
import type { InterviewRow, InterviewCandidateRow } from "./types";

export function InterviewsView({
  positionId,
  positionTitle,
  interviews,
  candidatesByInterview,
}: {
  positionId: string;
  positionTitle: string;
  interviews: InterviewRow[];
  candidatesByInterview: Record<string, InterviewCandidateRow[]>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Interviews — {positionTitle}</CardTitle>
          <ScheduleInterviewDialog positionId={positionId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {interviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No interviews scheduled yet. Shortlisted candidates will move to &quot;Interview Scheduled&quot; once you schedule one.
          </p>
        ) : (
          interviews.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} candidates={candidatesByInterview[interview.id] ?? []} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function InterviewCard({ interview, candidates }: { interview: InterviewRow; candidates: InterviewCandidateRow[] }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3">
        <p className="font-medium text-gray-900">
          {new Date(interview.interviewDate).toLocaleDateString()}
          {interview.interviewTime && ` · ${interview.interviewTime}`}
        </p>
        <p className="text-sm text-gray-500">
          {interview.venue ?? "Venue TBD"}
          {interview.panelInfo && ` · Panel: ${interview.panelInfo}`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c) => (
              <MarksRow key={c.applicationId} interviewId={interview.id} candidate={c} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MarksRow({ interviewId, candidate }: { interviewId: string; candidate: InterviewCandidateRow }) {
  const [isPending, startTransition] = useTransition();
  const [attendance, setAttendance] = useState(candidate.attendance ?? "present");
  const [marks, setMarks] = useState(candidate.marks?.toString() ?? "");
  const [remarks, setRemarks] = useState("");

  const onSave = () => {
    const formData = new FormData();
    formData.set("applicationId", candidate.applicationId);
    formData.set("interviewId", interviewId);
    formData.set("attendance", attendance);
    if (marks) formData.set("marks", marks);
    formData.set("remarks", remarks);
    startTransition(async () => {
      const result = await enterInterviewMarksAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Marks saved");
    });
  };

  const onFinalize = () => {
    startTransition(async () => {
      const result = await finalizeInterviewMarksAction(candidate.applicationId, interviewId);
      if (result?.error) toast.error(result.error);
      else toast.success("Marks finalized");
    });
  };

  const onReopen = () => {
    startTransition(async () => {
      const result = await reopenInterviewMarksAction(candidate.applicationId, interviewId);
      if (result?.error) toast.error(result.error);
      else toast.success("Marks reopened for editing");
    });
  };

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{candidate.applicantName}</p>
        <p className="text-xs text-gray-500">{candidate.applicationNumber ?? "—"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {candidate.status.replace(/_/g, " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Select
          value={attendance}
          onValueChange={(value) => setAttendance(value as "present" | "absent")}
          disabled={candidate.finalized || isPending}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
          disabled={candidate.finalized || isPending}
          className="h-8 w-20"
        />
      </TableCell>
      <TableCell>
        <Input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={candidate.finalized || isPending}
          className="h-8 w-32"
          placeholder="Optional"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {candidate.finalized ? (
            <>
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Finalized
              </Badge>
              <Button size="sm" variant="outline" onClick={onReopen} disabled={isPending}>
                <Unlock className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onSave} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" onClick={onFinalize} disabled={isPending}>
                Finalize
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ScheduleInterviewDialog({ positionId }: { positionId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("positionId", positionId);
    startTransition(async () => {
      const result = await scheduleInterviewAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Interview scheduled — shortlisted candidates moved to Interview Scheduled");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Schedule Interview</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="interviewDate">Date</Label>
            <Input id="interviewDate" name="interviewDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="interviewTime">Time</Label>
            <Input id="interviewTime" name="interviewTime" placeholder="e.g. 10:00 AM" />
          </div>
          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" name="venue" />
          </div>
          <div>
            <Label htmlFor="panelInfo">Interview Panel</Label>
            <Textarea id="panelInfo" name="panelInfo" rows={2} placeholder="Names / designations" />
          </div>
          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea id="instructions" name="instructions" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
