"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertFeeStructureAction } from "@/lib/actions/fees";
import { maxSemesterNumberFor, semesterLabel } from "@/lib/utils/degree-level";

type Program = { id: string; name: string; departmentName: string; degreeLevel: string };
type AcademicSession = { id: string; label: string };
type Component = { name: string; amount: string };

export function FeeStructureForm({
  programs,
  academicSessions,
  trigger,
  initial,
}: {
  programs: Program[];
  academicSessions: AcademicSession[];
  trigger: React.ReactNode;
  initial?: {
    programId: string;
    semesterNumber: number;
    academicSessionId: string;
    components: Component[];
  };
}) {
  const [open, setOpen] = useState(false);
  const [programId, setProgramId] = useState(initial?.programId ?? "");
  const [semesterNumber, setSemesterNumber] = useState(String(initial?.semesterNumber ?? ""));
  const [academicSessionId, setAcademicSessionId] = useState(initial?.academicSessionId ?? "");
  const [components, setComponents] = useState<Component[]>(initial?.components ?? [{ name: "Tuition Fee", amount: "" }]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const selectedProgram = programs.find((p) => p.id === programId);
  const availableSemesterNumbers = Array.from({ length: maxSemesterNumberFor(selectedProgram?.degreeLevel) }, (_, i) => i + 1);

  const onProgramChange = (nextProgramId: string) => {
    setProgramId(nextProgramId);
    const nextProgram = programs.find((p) => p.id === nextProgramId);
    const maxNumber = maxSemesterNumberFor(nextProgram?.degreeLevel);
    if (semesterNumber && Number(semesterNumber) > maxNumber) setSemesterNumber("");
  };

  const updateComponent = (i: number, field: keyof Component, value: string) => {
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const submit = () => {
    setError("");
    if (!programId || !semesterNumber || !academicSessionId) {
      setError("Select a program, semester, and academic session");
      return;
    }
    const validComponents = components.filter((c) => c.name.trim() && Number(c.amount) >= 0);
    if (validComponents.length === 0) {
      setError("Add at least one fee component with a name and amount");
      return;
    }

    const formData = new FormData();
    formData.set("programId", programId);
    formData.set("semesterNumber", semesterNumber);
    formData.set("academicSessionId", academicSessionId);
    formData.set("components", JSON.stringify(validComponents.map((c) => ({ name: c.name, amount: Number(c.amount) }))));

    startTransition(async () => {
      const result = await upsertFeeStructureAction(formData);
      if (result?.error) setError(result.error);
      else {
        toast.success("Fee structure saved");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Fee Structure" : "New Fee Structure"}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-4">
          <div>
            <Label>Program</Label>
            <Select value={programId} onValueChange={onProgramChange} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.departmentName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{selectedProgram && maxSemesterNumberFor(selectedProgram.degreeLevel) === 2 ? "Year" : "Semester Number"}</Label>
              <Select value={semesterNumber} onValueChange={setSemesterNumber} disabled={isPending || !programId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={programId ? "Select" : "Select a program first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSemesterNumbers.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {semesterLabel(n, selectedProgram?.degreeLevel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Academic Session</Label>
              <Select value={academicSessionId} onValueChange={setAcademicSessionId} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  {academicSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    placeholder="Component name (e.g. Tuition Fee)"
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
            Save Structure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
