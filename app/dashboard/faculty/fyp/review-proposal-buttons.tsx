"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewFypProposalAction } from "@/lib/actions/fyp-supervisor";

export function ReviewProposalButtons({ proposalId }: { proposalId: string }) {
  const [isPending, startTransition] = useTransition();

  const review = (approve: boolean) => {
    startTransition(async () => {
      const result = await reviewFypProposalAction(proposalId, approve);
      if (result?.error) toast.error(result.error);
      else toast.success(approve ? "Proposal approved" : "Proposal rejected");
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => review(false)} disabled={isPending}>
        Reject
      </Button>
      <Button size="sm" onClick={() => review(true)} disabled={isPending}>
        {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        Approve
      </Button>
    </div>
  );
}
