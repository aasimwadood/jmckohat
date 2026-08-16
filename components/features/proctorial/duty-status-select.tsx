"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDutyStatusAction } from "@/lib/actions/proctorial";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  completed: "default",
  missed: "destructive",
  cancelled: "outline",
};

export function DutyStatusSelect({ dutyId, status }: { dutyId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const formData = new FormData();
    formData.set("dutyId", dutyId);
    formData.set("status", value);
    startTransition(async () => {
      const result = await updateDutyStatusAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Duty status updated");
    });
  };

  return (
    <Select value={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-36">
        <SelectValue>
          <Badge variant={STATUS_VARIANT[status] ?? "default"} className="capitalize">
            {status}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="scheduled">Scheduled</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="missed">Missed</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}
