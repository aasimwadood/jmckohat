"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateTranscriptStatusAction } from "@/lib/actions/transcripts";

export function TranscriptStatusButtons({ requestId, status }: { requestId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  const update = (next: "processing" | "ready" | "rejected") => {
    startTransition(async () => {
      const result = await updateTranscriptStatusAction(requestId, next);
      if (result?.error) toast.error(result.error);
      else toast.success(`Marked as ${next}`);
    });
  };

  if (status === "ready" || status === "rejected") {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return (
    <div className="flex gap-2">
      {status === "pending" && (
        <Button size="sm" variant="outline" onClick={() => update("processing")} disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Start Processing
        </Button>
      )}
      <Button size="sm" onClick={() => update("ready")} disabled={isPending}>
        Mark Ready
      </Button>
    </div>
  );
}
