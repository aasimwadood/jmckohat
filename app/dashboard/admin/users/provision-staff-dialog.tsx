"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { provisionStaffAction } from "@/lib/actions/provision-staff";
import { COLLEGE_STAFF_ROLES, ROLE_LABELS } from "@/lib/permissions/roles";

type Department = { id: string; name: string };

export function ProvisionStaffDialog({ departments }: { departments: Department[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("faculty");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("role", role);
    formData.set("departmentId", departmentId);
    startTransition(async () => {
      const result = await provisionStaffAction(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  };

  const close = () => {
    setOpen(false);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Staff Account</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">An invite email has been sent so they can set their own password.</p>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" name="fullName" disabled={isPending} required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" disabled={isPending} required />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLEGE_STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
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
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" disabled={isPending} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
