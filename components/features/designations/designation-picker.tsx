"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setDesignationAssignmentAction, setHeadOfDepartmentAction } from "@/lib/actions/designations";

type PersonOption = { id: string; name: string; role: string };

export function DesignationPicker({
  designationTypeId,
  departmentId,
  currentProfileId,
  options,
}: {
  designationTypeId: string;
  departmentId: string | null;
  currentProfileId: string | null;
  options: PersonOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const formData = new FormData();
    formData.set("designationTypeId", designationTypeId);
    if (departmentId) formData.set("departmentId", departmentId);
    if (value !== "none") formData.set("profileId", value);
    startTransition(async () => {
      const result = await setDesignationAssignmentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(value === "none" ? "Designation cleared" : "Designation updated");
    });
  };

  return (
    <Select value={currentProfileId ?? "none"} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-full min-w-[200px]">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Not assigned" />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not assigned</SelectItem>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} <span className="text-xs capitalize text-gray-500">({p.role.replace(/_/g, " ")})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function HeadOfDepartmentPicker({
  departmentId,
  currentProfileId,
  options,
}: {
  departmentId: string;
  currentProfileId: string | null;
  options: PersonOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const formData = new FormData();
    formData.set("departmentId", departmentId);
    if (value !== "none") formData.set("profileId", value);
    startTransition(async () => {
      const result = await setHeadOfDepartmentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(value === "none" ? "Head of Department cleared" : "Head of Department updated");
    });
  };

  return (
    <Select value={currentProfileId ?? "none"} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-full min-w-[200px]">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Not assigned" />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not assigned</SelectItem>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} <span className="text-xs capitalize text-gray-500">({p.role.replace(/_/g, " ")})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
