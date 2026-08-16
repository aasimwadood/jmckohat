"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateComplaintStatusAction } from "@/lib/actions/proctorial";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  open: "destructive",
  reviewed: "secondary",
  resolved: "default",
};

export function ComplaintStatusSelect({ complaintId, status }: { complaintId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const formData = new FormData();
    formData.set("complaintId", complaintId);
    formData.set("status", value);
    startTransition(async () => {
      const result = await updateComplaintStatusAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Complaint status updated");
    });
  };

  return (
    <Select value={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-32">
        <SelectValue>
          <Badge variant={STATUS_VARIANT[status] ?? "default"} className="capitalize">
            {status}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">Open</SelectItem>
        <SelectItem value="reviewed">Reviewed</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
      </SelectContent>
    </Select>
  );
}
