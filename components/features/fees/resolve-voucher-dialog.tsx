"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { manuallyResolveFeeVoucherAction } from "@/lib/actions/fees";

export function ResolveVoucherDialog({ voucherId, voucherNumber }: { voucherId: string; voucherNumber: string }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"verify" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const openDialog = (a: "verify" | "cancel") => {
    setAction(a);
    setReason("");
    setError("");
    setOpen(true);
  };

  const submit = () => {
    if (!action) return;
    if (reason.trim().length < 5) {
      setError("Provide a brief reason (at least 5 characters)");
      return;
    }
    const formData = new FormData();
    formData.set("voucherId", voucherId);
    formData.set("action", action);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await manuallyResolveFeeVoucherAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success(action === "verify" ? "Voucher manually verified" : "Voucher canceled");
        setOpen(false);
      }
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => openDialog("verify")}>
          Verify Manually
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openDialog("cancel")}>
          Cancel Voucher
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "verify" ? "Manually Verify" : "Cancel"} Voucher {voucherNumber}</DialogTitle>
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
    </>
  );
}
