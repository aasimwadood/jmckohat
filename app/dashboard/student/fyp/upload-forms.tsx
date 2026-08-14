"use client";

import { useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFypProposalAction, uploadFypDeliverableAction } from "@/lib/actions/fyp";

export function UploadProposalForm({ groupId }: { groupId: string }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("groupId", groupId);
    startTransition(async () => {
      const result = await uploadFypProposalAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form action={onSubmit} className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <Label htmlFor="proposal-file">Proposal Document</Label>
        <Input id="proposal-file" name="file" type="file" className="mt-2" disabled={isPending} required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Submit Proposal
      </Button>
    </form>
  );
}

const DELIVERABLE_TYPES = [
  { value: "progress_report", label: "Progress Report" },
  { value: "final_report", label: "Final Report" },
  { value: "source_code", label: "Source Code" },
  { value: "demo_video", label: "Demo Video" },
  { value: "slides", label: "Slides" },
] as const;

export function UploadDeliverableForm({ groupId }: { groupId: string }) {
  const [type, setType] = useState<string>("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    if (!type) {
      setError("Select a deliverable type");
      return;
    }
    formData.set("groupId", groupId);
    formData.set("type", type);
    startTransition(async () => {
      const result = await uploadFypDeliverableAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={setType} disabled={isPending}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {DELIVERABLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="deliverable-file">File</Label>
        <Input id="deliverable-file" name="file" type="file" disabled={isPending} required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Upload
      </Button>
    </form>
  );
}
