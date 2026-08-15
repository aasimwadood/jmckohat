"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { withdrawApplicationAction } from "@/lib/actions/recruitment-applicant";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Withdraw this application? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await withdrawApplicationAction(applicationId);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Application withdrawn");
        router.refresh();
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw Application"}
    </Button>
  );
}
