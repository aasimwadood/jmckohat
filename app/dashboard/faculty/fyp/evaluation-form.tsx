"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitEvaluationAction, EVALUATION_CRITERIA } from "@/lib/actions/fyp-supervisor";

export function EvaluationForm({ groupId, alreadyEvaluated }: { groupId: string; alreadyEvaluated: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {alreadyEvaluated ? "Update Evaluation" : "Evaluate"}
      </Button>
    );
  }

  const onSubmit = (formData: FormData) => {
    formData.set("groupId", groupId);
    startTransition(async () => {
      const result = await submitEvaluationAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Evaluation saved");
        setOpen(false);
      }
    });
  };

  return (
    <form action={onSubmit} className="mt-2 space-y-3 rounded-lg bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {EVALUATION_CRITERIA.map((c) => (
          <div key={c.key}>
            <Label htmlFor={c.key} className="text-xs">
              {c.label} (/{c.max})
            </Label>
            <Input id={c.key} name={c.key} type="number" min={0} max={c.max} disabled={isPending} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Save Evaluation
        </Button>
      </div>
    </form>
  );
}
