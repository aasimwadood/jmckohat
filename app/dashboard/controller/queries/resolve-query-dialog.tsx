"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { resolveResultQueryAction } from "@/lib/actions/transcripts";

export function ResolveQueryDialog({ queryId }: { queryId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (status: "resolved" | "rejected") => {
    setError("");
    const formData = new FormData(formRef.current ?? undefined);
    formData.set("queryId", queryId);
    formData.set("status", status);
    startTransition(async () => {
      const result = await resolveResultQueryAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Result Query</DialogTitle>
        </DialogHeader>
        <form ref={formRef} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="resolutionNote">Resolution Note</Label>
            <Textarea id="resolutionNote" name="resolutionNote" rows={4} disabled={isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => submit("rejected")}>
              Reject
            </Button>
            <Button type="button" disabled={isPending} onClick={() => submit("resolved")}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Resolved
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
