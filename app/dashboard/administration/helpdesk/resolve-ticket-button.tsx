"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateTicketStatusAction } from "@/lib/actions/operations";

export function ResolveTicketButton({ ticketId, status }: { ticketId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  if (status === "resolved" || status === "closed") {
    return <span className="text-sm text-gray-400">—</span>;
  }

  const update = (next: "in_progress" | "resolved") => {
    startTransition(async () => {
      const result = await updateTicketStatusAction(ticketId, next);
      if (result?.error) toast.error(result.error);
      else toast.success(`Marked as ${next.replace("_", " ")}`);
    });
  };

  return (
    <div className="flex gap-2">
      {status === "open" && (
        <Button size="sm" variant="outline" onClick={() => update("in_progress")} disabled={isPending}>
          Start
        </Button>
      )}
      <Button size="sm" onClick={() => update("resolved")} disabled={isPending}>
        {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        Resolve
      </Button>
    </div>
  );
}
