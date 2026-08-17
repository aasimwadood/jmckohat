"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { submitAssignmentAction } from "@/lib/actions/assignments";

export function SubmitAssignmentCell({
  assignmentId,
  title,
  description,
  submitted,
  isPastDeadline,
}: {
  assignmentId: string;
  title: string;
  description: string | null;
  submitted: boolean;
  isPastDeadline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await submitAssignmentAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  if (!submitted && isPastDeadline) {
    return (
      <Button size="sm" variant="outline" disabled title="The deadline for this assignment has passed">
        Deadline Passed
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {submitted ? (
          <>
            <Eye className="mr-1 h-4 w-4" />
            View
          </>
        ) : (
          <>
            <Upload className="mr-1 h-4 w-4" />
            Submit
          </>
        )}
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {submitted ? (
          <p className="text-sm text-gray-600">You&apos;ve already submitted this assignment.</p>
        ) : (
          <form ref={formRef} action={onSubmit} className="space-y-4">
            <input type="hidden" name="assignmentId" value={assignmentId} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label htmlFor="file">Upload Assignment</Label>
              <Input id="file" name="file" type="file" className="mt-2" disabled={isPending} required />
              <p className="mt-1 text-xs text-gray-500">Accepted formats: PDF, DOCX, ZIP (Max 10MB)</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Assignment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
