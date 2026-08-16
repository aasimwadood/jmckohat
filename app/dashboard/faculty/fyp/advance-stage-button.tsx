"use client";

import { useTransition } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { advanceFypStageAction } from "@/lib/actions/fyp-supervisor";
import { nextFypStage } from "@/lib/utils/fyp";

export function AdvanceStageButton({ groupId, currentStatus }: { groupId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const target = nextFypStage(currentStatus);

  if (!target) return null;

  const advance = () => {
    startTransition(async () => {
      const result = await advanceFypStageAction(groupId, target);
      if (result?.error) toast.error(result.error);
      else toast.success(`Advanced to ${target.replace(/_/g, " ")}`);
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={advance} disabled={isPending}>
      {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1 h-4 w-4" />}
      Advance to {target.replace(/_/g, " ")}
    </Button>
  );
}
