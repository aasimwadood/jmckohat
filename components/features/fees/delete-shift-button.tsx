"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteShiftAction } from "@/lib/actions/shifts";

export function DeleteShiftButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Remove this shift? Students or bank accounts already assigned to it must be reassigned first.")) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteShiftAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Shift removed");
    });
  };

  return (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
    </Button>
  );
}
