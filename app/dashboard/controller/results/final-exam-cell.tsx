"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { setFinalExamMarkAction } from "@/lib/actions/results";

export function FinalExamCell({
  studentProfileId,
  courseId,
  semesterId,
  finalExam,
}: {
  studentProfileId: string;
  courseId: string;
  semesterId: string;
  finalExam: number;
}) {
  const [value, setValue] = useState(String(finalExam));
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const formData = new FormData();
    formData.set("studentProfileId", studentProfileId);
    formData.set("courseId", courseId);
    formData.set("semesterId", semesterId);
    formData.set("finalExam", value);
    startTransition(async () => {
      const result = await setFinalExamMarkAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Final Exam mark recorded");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={50}
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={isPending}
        className="h-8 w-20"
      />
      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
    </div>
  );
}
