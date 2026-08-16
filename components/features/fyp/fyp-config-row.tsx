"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setFypConfigAction } from "@/lib/actions/fyp-config";

type Config = {
  isEnabled: boolean;
  maxMembers: number;
  supervisorQuota: number;
  proposalDeadline: string | null;
  midSemesterDeadline: string | null;
  finalDeadline: string | null;
};

export function FypConfigRow({
  semesterId,
  semesterNumber,
  batches,
  config,
}: {
  semesterId: string;
  semesterNumber: number;
  batches: string[];
  config: Config;
}) {
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [maxMembers, setMaxMembers] = useState(config.maxMembers);
  const [supervisorQuota, setSupervisorQuota] = useState(config.supervisorQuota);
  const [proposalDeadline, setProposalDeadline] = useState(config.proposalDeadline ?? "");
  const [midSemesterDeadline, setMidSemesterDeadline] = useState(config.midSemesterDeadline ?? "");
  const [finalDeadline, setFinalDeadline] = useState(config.finalDeadline ?? "");
  const [isPending, startTransition] = useTransition();

  const save = (overrides: Partial<{ isEnabled: boolean }> = {}) => {
    const nextEnabled = overrides.isEnabled ?? isEnabled;
    const formData = new FormData();
    formData.set("semesterId", semesterId);
    formData.set("isEnabled", String(nextEnabled));
    formData.set("maxMembers", String(maxMembers));
    formData.set("supervisorQuota", String(supervisorQuota));
    formData.set("proposalDeadline", proposalDeadline);
    formData.set("midSemesterDeadline", midSemesterDeadline);
    formData.set("finalDeadline", finalDeadline);
    startTransition(async () => {
      const result = await setFypConfigAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`Semester ${semesterNumber} FYP settings saved`);
    });
  };

  const onToggle = (checked: boolean) => {
    setIsEnabled(checked);
    save({ isEnabled: checked });
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">
            Semester {semesterNumber}
            {batches.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({batches.join(", ")})</span>}
          </p>
          {batches.length === 0 && <p className="text-xs text-gray-400">No students currently in this semester</p>}
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <Switch checked={isEnabled} onCheckedChange={onToggle} disabled={isPending} />
          <span className="text-sm text-gray-600">{isEnabled ? "Enabled" : "Disabled"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <Label className="mb-1 block text-xs">Max group size</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
            onBlur={() => save()}
            disabled={isPending}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Supervisor quota</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={supervisorQuota}
            onChange={(e) => setSupervisorQuota(Number(e.target.value))}
            onBlur={() => save()}
            disabled={isPending}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Proposal deadline</Label>
          <Input type="date" value={proposalDeadline} onChange={(e) => setProposalDeadline(e.target.value)} onBlur={() => save()} disabled={isPending} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Mid-semester deadline</Label>
          <Input type="date" value={midSemesterDeadline} onChange={(e) => setMidSemesterDeadline(e.target.value)} onBlur={() => save()} disabled={isPending} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Final deadline</Label>
          <Input type="date" value={finalDeadline} onChange={(e) => setFinalDeadline(e.target.value)} onBlur={() => save()} disabled={isPending} />
        </div>
      </div>
    </div>
  );
}
