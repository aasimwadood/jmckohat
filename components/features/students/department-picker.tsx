"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function DepartmentPicker({
  departments,
  selectedId,
}: {
  departments: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <div className="max-w-xs">
      <Label>Department</Label>
      <Select value={selectedId} onValueChange={(v) => router.push(`/dashboard/students?departmentId=${v}`)}>
        <SelectTrigger>
          <SelectValue placeholder="Select a department" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
