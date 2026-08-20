"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertSectionAction } from "@/lib/actions/groups-sections";

export function SectionForm({
  departmentId,
  groups,
  initial,
}: {
  departmentId: string;
  groups: { id: string; name: string }[];
  initial?: { id: string; name: string; code: string; groupId: string };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [groupId, setGroupId] = useState(initial?.groupId ?? "");
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError("");
    if (!groupId) {
      setError("Select a group");
      return;
    }
    formData.set("departmentId", departmentId);
    formData.set("groupId", groupId);
    if (initial) formData.set("id", initial.id);
    startTransition(async () => {
      const result = await upsertSectionAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success(initial ? "Section updated" : "Section added");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button size="sm" variant="outline">
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        ) : (
          <Button disabled={groups.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Section" : "New Section"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label>Group *</Label>
            <Select value={groupId} onValueChange={setGroupId} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Section Name *</Label>
            <Input id="name" name="name" defaultValue={initial?.name} placeholder="e.g. A" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" defaultValue={initial?.code} placeholder="e.g. a" disabled={isPending} required />
            <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, - or _ only. Must be unique within the group.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
