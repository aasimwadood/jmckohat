"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignDutyAction } from "@/lib/actions/proctorial";

type StaffProctor = { profileId: string; name: string; departmentId: string; departmentName: string };

const DUTY_TYPES = ["Gate Duty", "Exam Duty", "Campus Patrol", "Other"];

export function AssignDutyForm({ staffProctors }: { staffProctors: StaffProctor[] }) {
  const [assignedTo, setAssignedTo] = useState("");
  const [dutyType, setDutyType] = useState("");
  const [dutyDate, setDutyDate] = useState("");
  const [shiftTime, setShiftTime] = useState("");
  const [location, setLocation] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo || !dutyType || !dutyDate) {
      toast.error("Select a proctor, duty type, and date");
      return;
    }
    const proctor = staffProctors.find((p) => p.profileId === assignedTo);
    const formData = new FormData();
    formData.set("assignedTo", assignedTo);
    if (proctor) formData.set("departmentId", proctor.departmentId);
    formData.set("dutyType", dutyType);
    formData.set("dutyDate", dutyDate);
    formData.set("shiftTime", shiftTime);
    formData.set("location", location);
    startTransition(async () => {
      const result = await assignDutyAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Duty assigned");
        setAssignedTo("");
        setDutyType("");
        setDutyDate("");
        setShiftTime("");
        setLocation("");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block">Staff Proctor</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Select a proctor" />
            </SelectTrigger>
            <SelectContent>
              {staffProctors.map((p) => (
                <SelectItem key={p.profileId} value={p.profileId}>
                  {p.name} ({p.departmentName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Duty Type</Label>
          <Select value={dutyType} onValueChange={setDutyType} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Select duty type" />
            </SelectTrigger>
            <SelectContent>
              {DUTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Date</Label>
          <Input type="date" value={dutyDate} onChange={(e) => setDutyDate(e.target.value)} disabled={isPending} />
        </div>
        <div>
          <Label className="mb-1 block">Shift / Time (optional)</Label>
          <Input placeholder="e.g. 8:00 AM - 12:00 PM" value={shiftTime} onChange={(e) => setShiftTime(e.target.value)} disabled={isPending} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1 block">Location (optional)</Label>
          <Input placeholder="e.g. Main Gate" value={location} onChange={(e) => setLocation(e.target.value)} disabled={isPending} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Assign Duty
      </Button>
    </form>
  );
}
