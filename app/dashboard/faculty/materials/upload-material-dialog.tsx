"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { uploadMaterialAction } from "@/lib/actions/materials";
import { MATERIAL_TYPES } from "@/lib/validations/materials";

type Course = { id: string; code: string; title: string };

const TYPE_LABELS: Record<(typeof MATERIAL_TYPES)[number], string> = {
  lecture_slides: "Lecture Slides",
  notes: "Notes",
  assignment: "Assignment",
  reference: "Reference",
  other: "Other",
};

export function UploadMaterialDialog({ courses }: { courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState<string>("lecture_slides");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("courseId", courseId);
    formData.set("type", type);
    startTransition(async () => {
      const result = await uploadMaterialAction(formData);
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
          Upload Material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Material</DialogTitle>
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
            <Label htmlFor="title">Material Title *</Label>
            <Input id="title" name="title" placeholder="e.g. Lecture 01 - Introduction" disabled={isPending} required />
          </div>
          <div>
            <Label>Material Type</Label>
            <Select value={type} onValueChange={setType} disabled={isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="file">File *</Label>
            <Input id="file" name="file" type="file" className="mt-2" disabled={isPending} required />
            <p className="mt-1 text-xs text-gray-500">PDF, PPTX, DOCX up to 25MB</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
