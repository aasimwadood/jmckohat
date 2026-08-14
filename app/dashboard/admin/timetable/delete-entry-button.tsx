"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTimetableEntryAction } from "@/lib/actions/timetable";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Delete this timetable entry?")) return;
    startTransition(async () => {
      const result = await deleteTimetableEntryAction(entryId);
      if (result?.error) toast.error(result.error);
      else toast.success("Entry deleted");
    });
  };

  return (
    <Button size="sm" variant="outline" className="text-red-600" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
