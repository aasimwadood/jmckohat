"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserActiveAction } from "@/lib/actions/users";

export function ToggleActiveButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await setUserActiveAction(userId, !isActive);
      if (result?.error) toast.error(result.error);
      else toast.success(isActive ? "User deactivated" : "User reactivated");
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={toggle} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
