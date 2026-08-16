"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { setDesignationAssignmentAction, setHeadOfDepartmentAction } from "@/lib/actions/designations";

type PersonOption = { id: string; name: string; role: string };

function PersonCombobox({
  currentProfileId,
  options,
  disabled,
  onSelect,
}: {
  currentProfileId: string | null;
  options: PersonOption[];
  disabled: boolean;
  onSelect: (profileId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((p) => p.id === currentProfileId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full min-w-[220px] justify-between font-normal"
        >
          <span className="truncate">{current ? current.name : "Not assigned"}</span>
          {disabled ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search by name..." />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !currentProfileId ? "opacity-100" : "opacity-0")} />
                Not assigned
              </CommandItem>
              {options.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", currentProfileId === p.id ? "opacity-100" : "opacity-0")} />
                  {p.name} <span className="ml-1 text-xs capitalize text-gray-500">({p.role.replace(/_/g, " ")})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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

  const onSelect = (profileId: string | null) => {
    const formData = new FormData();
    formData.set("designationTypeId", designationTypeId);
    if (departmentId) formData.set("departmentId", departmentId);
    if (profileId) formData.set("profileId", profileId);
    startTransition(async () => {
      const result = await setDesignationAssignmentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(profileId ? "Designation updated" : "Designation cleared");
    });
  };

  return <PersonCombobox currentProfileId={currentProfileId} options={options} disabled={isPending} onSelect={onSelect} />;
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

  const onSelect = (profileId: string | null) => {
    const formData = new FormData();
    formData.set("departmentId", departmentId);
    if (profileId) formData.set("profileId", profileId);
    startTransition(async () => {
      const result = await setHeadOfDepartmentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(profileId ? "Head of Department updated" : "Head of Department cleared");
    });
  };

  return <PersonCombobox currentProfileId={currentProfileId} options={options} disabled={isPending} onSelect={onSelect} />;
}
