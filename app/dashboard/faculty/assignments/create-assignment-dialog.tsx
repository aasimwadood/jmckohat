"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createAssignmentAction } from "@/lib/actions/assignments";

type Course = { id: string; code: string; title: string };

export function CreateAssignmentDialog({ courses }: { courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("courseId", courseId);
    startTransition(async () => {
      const result = await createAssignmentAction(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setCourseId("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New Assignment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code}: {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Assignment Title *</Label>
            <Input id="title" name="title" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input id="dueDate" name="dueDate" type="date" disabled={isPending} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
