"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { withdrawFypGroupAction } from "@/lib/actions/fyp";

export function WithdrawGroupButton({ groupId }: { groupId: string }) {
  const [isPending, startTransition] = useTransition();

  const withdraw = () => {
    startTransition(async () => {
      const result = await withdrawFypGroupAction(groupId);
      if (result?.error) toast.error(result.error);
      else toast.success("Group withdrawn — you can now form a new one");
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={withdraw} disabled={isPending}>
      {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
      Withdraw & start over
    </Button>
  );
}
