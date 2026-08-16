"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FypConfigRow } from "@/components/features/fyp/fyp-config-row";

type BatchEntry = {
  batch: string;
  semesterId: string;
  semesterNumber: number;
  config: {
    isEnabled: boolean;
    maxMembers: number;
    supervisorQuota: number;
    proposalDeadline: string | null;
    midSemesterDeadline: string | null;
    finalDeadline: string | null;
  };
};

export function FypBatchConfig({ entries }: { entries: BatchEntry[] }) {
  const [selected, setSelected] = useState(entries[0]?.batch ?? "");
  const current = entries.find((e) => e.batch === selected);

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        No batch is in its final semesters yet — FYP settings appear here once a batch reaches its last few semesters.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label className="mb-1 block text-xs">Batch</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select a batch" />
          </SelectTrigger>
          <SelectContent>
            {entries.map((e) => (
              <SelectItem key={e.batch} value={e.batch}>
                {e.batch} (Semester {e.semesterNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {current && (
        <FypConfigRow
          semesterId={current.semesterId}
          semesterNumber={current.semesterNumber}
          batches={[current.batch]}
          config={current.config}
        />
      )}
    </div>
  );
}
