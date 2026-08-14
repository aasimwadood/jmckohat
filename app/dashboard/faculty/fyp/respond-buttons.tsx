"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { respondToSupervisionAction } from "@/lib/actions/fyp-supervisor";

export function RespondToSupervisionButtons({ groupId }: { groupId: string }) {
  const [isPending, startTransition] = useTransition();

  const respond = (approve: boolean) => {
    startTransition(async () => {
      const result = await respondToSupervisionAction(groupId, approve);
      if (result?.error) toast.error(result.error);
      else toast.success(approve ? "Group approved" : "Group declined");
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => respond(false)} disabled={isPending}>
        Decline
      </Button>
      <Button size="sm" onClick={() => respond(true)} disabled={isPending}>
        {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        Approve
      </Button>
    </div>
  );
}
