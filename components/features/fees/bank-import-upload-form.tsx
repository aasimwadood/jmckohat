"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadBankImportAction } from "@/lib/actions/fee-imports";

export function BankImportUploadForm() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Select a bank Excel file (.xlsx or .xls)");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadBankImportAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("File uploaded — review the preview before confirming");
      if (result.importId) router.push(`/dashboard/administration/finance/import/${result.importId}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <Input ref={inputRef} type="file" accept=".xlsx,.xls" disabled={isPending} />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Upload & Preview
      </Button>
    </form>
  );
}
