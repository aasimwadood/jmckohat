"use client";

import { useTransition } from "react";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateFeeVoucherAction } from "@/lib/actions/fees";

export function GenerateFeeButton({ promotionId }: { promotionId: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const formData = new FormData();
    formData.set("promotionId", promotionId);
    startTransition(async () => {
      const result = await generateFeeVoucherAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Fee voucher generated");
    });
  };

  return (
    <Button onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
      Generate Fee
    </Button>
  );
}
