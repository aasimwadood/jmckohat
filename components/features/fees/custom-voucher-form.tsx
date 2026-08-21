"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { generateCustomFeeVoucherAction } from "@/lib/actions/fees";

type Student = { id: string; name: string; registrationNumber: string | null };
type Component = { name: string; amount: string };

const REASON_PRESETS = ["Repeat Paper", "Degree Fee", "Migration Certificate"];

function StudentCombobox({ students, studentId, onSelect, disabled }: { students: Student[]; studentId: string; onSelect: (id: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const current = students.find((s) => s.id === studentId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between font-normal">
          <span className="truncate">{current ? `${current.name} (${current.registrationNumber ?? "no reg #"})` : "Select a student"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search by name or registration number..." />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {students.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.registrationNumber ?? ""}`}
                  onSelect={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", studentId === s.id ? "opacity-100" : "opacity-0")} />
                  {s.name} <span className="ml-1 text-xs text-gray-500">({s.registrationNumber ?? "no reg #"})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function CustomVoucherForm({ students }: { students: Student[] }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");
  const [components, setComponents] = useState<Component[]>([{ name: "", amount: "" }]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const updateComponent = (i: number, field: keyof Component, value: string) => {
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const reset = () => {
    setStudentId("");
    setReason("");
    setComponents([{ name: "", amount: "" }]);
    setError("");
  };

  const submit = () => {
    setError("");
    if (!studentId) {
      setError("Select a student");
      return;
    }
    if (!reason.trim()) {
      setError("Provide a reason for this voucher");
      return;
    }
    const validComponents = components.filter((c) => c.name.trim() && Number(c.amount) >= 0);
    if (validComponents.length === 0) {
      setError("Add at least one fee component with a name and amount");
      return;
    }

    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("reason", reason.trim());
    formData.set("components", JSON.stringify(validComponents.map((c) => ({ name: c.name, amount: Number(c.amount) }))));

    startTransition(async () => {
      const result = await generateCustomFeeVoucherAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success("Custom voucher generated");
        setOpen(false);
        reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Custom Voucher
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Custom Voucher</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-4">
          <div>
            <Label>Student</Label>
            <StudentCombobox students={students} studentId={studentId} onSelect={setStudentId} disabled={isPending} />
          </div>

          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeat Paper - CS301" disabled={isPending} />
            <div className="mt-2 flex flex-wrap gap-2">
              {REASON_PRESETS.map((preset) => (
                <Button key={preset} type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => setReason(preset)}>
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Fee Components</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setComponents((prev) => [...prev, { name: "", amount: "" }])}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Component name (e.g. Repeat Paper Fee)"
                    value={c.name}
                    disabled={isPending}
                    onChange={(e) => updateComponent(i, "name", e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Amount"
                    value={c.amount}
                    disabled={isPending}
                    className="w-32"
                    onChange={(e) => updateComponent(i, "amount", e.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={isPending || components.length === 1}
                    onClick={() => setComponents((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-semibold text-gray-900">Total: PKR {total.toLocaleString()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
