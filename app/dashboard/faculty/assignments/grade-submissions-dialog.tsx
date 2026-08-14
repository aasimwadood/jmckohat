"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { gradeSubmissionAction } from "@/lib/actions/assignments";

type Submission = { id: string; studentName: string; grade: number | null; fileUrl: string | null };

export function GradeSubmissionsDialog({ title, submissions }: { title: string; submissions: Submission[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CheckSquare className="mr-1 h-4 w-4" />
        Grade
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grade Assignment: {title}</DialogTitle>
          <DialogDescription>{submissions.length} submission(s) received</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((s) => (
              <SubmissionRow key={s.id} submission={s} />
            ))}
            {submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-gray-500">
                  No submissions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const formData = new FormData();
    formData.set("submissionId", submission.id);
    formData.set("grade", grade);
    startTransition(async () => {
      await gradeSubmissionAction(formData);
    });
  };

  return (
    <TableRow>
      <TableCell>{submission.studentName}</TableCell>
      <TableCell>
        {submission.fileUrl ? (
          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            View
          </a>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-20"
            disabled={isPending}
          />
          <Button size="sm" onClick={save} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
