"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { manuallyClearAdmissionFeeAction } from "@/lib/actions/fees";

export function ManuallyClearAdmissionFeeDialog({ admissionId, applicantName }: { admissionId: string; applicantName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    if (reason.trim().length < 5) {
      setError("Provide a brief reason (at least 5 characters)");
      return;
    }
    const formData = new FormData();
    formData.set("admissionId", admissionId);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await manuallyClearAdmissionFeeAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success("Fee manually cleared");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Manually Clear
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manually Clear Fee — {applicantName}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div>
          <Label htmlFor="reason">Reason (required, audit-logged)</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={isPending} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
