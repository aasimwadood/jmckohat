"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { addStudentFineAction } from "@/lib/actions/fines";
import type { FINE_TYPES } from "@/lib/validations/fines";

type Student = { id: string; name: string; registrationNumber: string | null };
type FineType = (typeof FINE_TYPES)[number];

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

/**
 * Shared fine-entry form for the three authorities fee_payments_insert_fines_scoped
 * (0080) actually grants: department/focal_person_intermediate (attendance),
 * Chief/Staff Proctor (proctorial), Librarian (library) — each surface fixes
 * `fineType` to the one value its own RLS branch allows, so a rejected
 * insert here means the caller doesn't actually hold the authority the page
 * assumed, not a UI bug.
 */
export function AddFineForm({ students, fineType, title }: { students: Student[]; fineType: FineType; title: string }) {
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    if (!studentId) {
      setError("Select a student");
      return;
    }
    if (!(Number(amount) > 0)) {
      setError("Enter an amount greater than zero");
      return;
    }
    if (!notes.trim()) {
      setError("Provide a brief reason");
      return;
    }

    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("fineType", fineType);
    formData.set("amount", amount);
    formData.set("notes", notes.trim());

    startTransition(async () => {
      const result = await addStudentFineAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Fine added");
      setStudentId("");
      setAmount("");
      setNotes("");
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <Label className="mb-1 block">Student</Label>
        <StudentCombobox students={students} studentId={studentId} onSelect={setStudentId} disabled={isPending} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block">Amount (PKR)</Label>
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isPending} />
        </div>
      </div>
      <div>
        <Label className="mb-1 block">Reason</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isPending} rows={2} placeholder="e.g. 3 unexcused absences in CS301" />
      </div>
      <Button onClick={submit} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Fine
      </Button>
    </div>
  );
}
