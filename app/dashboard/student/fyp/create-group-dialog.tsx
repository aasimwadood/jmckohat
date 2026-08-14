"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createFypGroupAction } from "@/lib/actions/fyp";

type Person = { id: string; full_name: string };

export function CreateFypGroupDialog({
  departmentId,
  semesterId,
  maxMembers,
  classmates,
  supervisors,
}: {
  departmentId: string;
  semesterId: string;
  maxMembers: number;
  classmates: Person[];
  supervisors: Person[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length < maxMembers ? [...prev, id] : prev,
    );
  };

  const onSubmit = (formData: FormData) => {
    setError("");
    if (!supervisorId) {
      setError("Select a supervisor");
      return;
    }
    formData.set("departmentId", departmentId);
    formData.set("semesterId", semesterId);
    formData.set("supervisorProfileId", supervisorId);
    selectedMembers.forEach((id) => formData.append("memberIds", id));

    startTransition(async () => {
      const result = await createFypGroupAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Form a Group</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Form FYP Group</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="title">Project Title (optional)</Label>
            <Input id="title" name="title" disabled={isPending} />
          </div>
          <div>
            <Label>Team Members (up to {maxMembers})</Label>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {classmates.length === 0 && <p className="text-sm text-gray-500">No classmates available.</p>}
              {classmates.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedMembers.includes(c.id)}
                    onCheckedChange={() => toggleMember(c.id)}
                    disabled={isPending}
                  />
                  {c.full_name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="supervisor">Supervisor</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId} disabled={isPending}>
              <SelectTrigger id="supervisor">
                <SelectValue placeholder="Select a supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
