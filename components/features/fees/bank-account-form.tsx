"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertBankAccountAction } from "@/lib/actions/bank-accounts";

export function BankAccountForm({
  initial,
  shifts = [],
}: {
  initial?: { id: string; bankName: string; accountTitle: string | null; accountNumber: string; shiftId: string | null };
  shifts?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [shiftId, setShiftId] = useState(initial?.shiftId ?? "");
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError("");
    if (initial) formData.set("id", initial.id);
    formData.set("shiftId", shiftId);
    startTransition(async () => {
      const result = await upsertBankAccountAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success(initial ? "Bank account updated" : "Bank account added");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="sm" variant="outline">
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Bank Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Bank Account" : "New Bank Account"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="bankName">Bank Name *</Label>
            <Input id="bankName" name="bankName" defaultValue={initial?.bankName} placeholder="e.g. Bank Al Habib" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="accountTitle">Account Title</Label>
            <Input id="accountTitle" name="accountTitle" defaultValue={initial?.accountTitle ?? ""} placeholder="e.g. Principal GPGC Kohat" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input id="accountNumber" name="accountNumber" defaultValue={initial?.accountNumber} disabled={isPending} required />
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={shiftId || "none"} onValueChange={(v) => setShiftId(v === "none" ? "" : v)} disabled={isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General (all shifts)</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              A shift-specific account only prints on vouchers for students in that shift; General prints on every voucher.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
