"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ShiftFilter({
  shifts,
  selectedId,
  basePath,
}: {
  shifts: { id: string; name: string }[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();

  if (shifts.length === 0) return null;

  return (
    <div className="max-w-xs">
      <Label>Shift</Label>
      <Select
        value={selectedId || "all"}
        onValueChange={(v) => router.push(v === "all" ? basePath : `${basePath}?shiftId=${v}`)}
      >
        <SelectTrigger>
          <SelectValue placeholder="All shifts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All shifts</SelectItem>
          {shifts.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
