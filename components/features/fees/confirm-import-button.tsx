"use client";

import { useTransition } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmBankImportAction } from "@/lib/actions/fee-imports";

export function ConfirmImportButton({ importId }: { importId: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const formData = new FormData();
    formData.set("importId", importId);
    startTransition(async () => {
      const result = await confirmBankImportAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Import processed — payments matched");
    });
  };

  return (
    <Button onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
      Confirm Import
    </Button>
  );
}
