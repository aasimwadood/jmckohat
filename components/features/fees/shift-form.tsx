"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { upsertShiftAction } from "@/lib/actions/shifts";

export function ShiftForm({ initial }: { initial?: { id: string; name: string; code: string } }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError("");
    if (initial) formData.set("id", initial.id);
    startTransition(async () => {
      const result = await upsertShiftAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success(initial ? "Shift updated" : "Shift added");
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
            Add Shift
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Shift" : "New Shift"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="name">Shift Name *</Label>
            <Input id="name" name="name" defaultValue={initial?.name} placeholder="e.g. Evening" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" defaultValue={initial?.code} placeholder="e.g. evening" disabled={isPending} required />
            <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, - or _ only. Must be unique per college.</p>
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
