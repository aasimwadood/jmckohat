"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteMaterialAction } from "@/lib/actions/materials";

export function DeleteMaterialButton({ materialId }: { materialId: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Delete this material? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteMaterialAction(materialId);
      if (result?.error) toast.error(result.error);
      else toast.success("Material deleted");
    });
  };

  return (
    <Button size="sm" variant="outline" className="text-red-600" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
