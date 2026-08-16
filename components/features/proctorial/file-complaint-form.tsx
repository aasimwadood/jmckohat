"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileComplaintAction } from "@/lib/actions/proctorial";

type Student = { id: string; name: string };

export function FileComplaintForm({ students }: { students: Student[] }) {
  const [description, setDescription] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Enter a description");
      return;
    }
    const formData = new FormData();
    formData.set("description", description.trim());
    if (studentId) formData.set("againstStudentId", studentId);
    startTransition(async () => {
      const result = await fileComplaintAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Complaint filed");
        setDescription("");
        setStudentId("");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
      {students.length > 0 && (
        <div>
          <Label className="mb-1 block">Against student (optional)</Label>
          <Select value={studentId || "none"} onValueChange={(v) => setStudentId(v === "none" ? "" : v)} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="No specific student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific student</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="mb-1 block">Description</Label>
        <Textarea
          placeholder="Describe what happened..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        File Complaint
      </Button>
    </form>
  );
}
