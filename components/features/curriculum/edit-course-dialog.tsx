"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { updateCourseAction } from "@/lib/actions/curriculum";

type Program = { id: string; name: string };
type Course = { id: string; code: string; title: string; credits: number; program_id: string | null };

export function EditCourseDialog({ course, programs }: { course: Course; programs: Program[] }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(course.code);
  const [title, setTitle] = useState(course.title);
  const [credits, setCredits] = useState(String(course.credits));
  const [programId, setProgramId] = useState(course.program_id ?? "");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      toast.error("Enter a course code and title");
      return;
    }
    const formData = new FormData();
    formData.set("courseId", course.id);
    formData.set("code", code.trim());
    formData.set("title", title.trim());
    formData.set("credits", credits);
    if (programId) formData.set("programId", programId);
    startTransition(async () => {
      const result = await updateCourseAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Course updated");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-1">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block text-xs">Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={isPending} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Credits</Label>
            <Input type="number" min={1} max={10} value={credits} onChange={(e) => setCredits(e.target.value)} disabled={isPending} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Program</Label>
            <Select value={programId || "none"} onValueChange={(v) => setProgramId(v === "none" ? "" : v)} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
