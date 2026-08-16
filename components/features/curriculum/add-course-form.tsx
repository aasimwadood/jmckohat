"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCourseAction } from "@/lib/actions/curriculum";

type Program = { id: string; name: string };

export function AddCourseForm({ programs }: { programs: Program[] }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [credits, setCredits] = useState("3");
  const [programId, setProgramId] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      toast.error("Enter a course code and title");
      return;
    }
    const formData = new FormData();
    formData.set("code", code.trim());
    formData.set("title", title.trim());
    formData.set("credits", credits);
    if (programId) formData.set("programId", programId);
    startTransition(async () => {
      const result = await createCourseAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(`${code.trim()} added`);
        setCode("");
        setTitle("");
        setCredits("3");
        setProgramId("");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-5">
      <div>
        <Label className="mb-1 block text-xs">Code</Label>
        <Input placeholder="CS201" value={code} onChange={(e) => setCode(e.target.value)} disabled={isPending} />
      </div>
      <div className="sm:col-span-2">
        <Label className="mb-1 block text-xs">Title</Label>
        <Input placeholder="Data Structures" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
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
      <div className="sm:col-span-5">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Course
        </Button>
      </div>
    </form>
  );
}
