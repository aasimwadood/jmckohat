"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDesignationTypeAction } from "@/lib/actions/designations";

export function AddDesignationTypeForm() {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"college" | "department">("college");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a name for the new designation");
      return;
    }
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("scope", scope);
    startTransition(async () => {
      const result = await createDesignationTypeAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(`Added "${name.trim()}"`);
        setName("");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex-1 min-w-[200px]">
        <label className="mb-1 block text-sm text-gray-600">New designation name</label>
        <Input
          placeholder="e.g. Sports Focal Person"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">Applies to</label>
        <Select value={scope} onValueChange={(v) => setScope(v as "college" | "department")} disabled={isPending}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="college">Whole college</SelectItem>
            <SelectItem value="department">Per department</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Add
      </Button>
    </form>
  );
}
