"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createDirectorateAction, createJmcAction, createCollegeAction, toggleDirectorateStatusAction, toggleJmcStatusAction, toggleCollegeStatusAction } from "@/lib/actions/org";
import { provisionOrgAdminAction } from "@/lib/actions/provision-org-admin";

type Option = { id: string; name: string };

function useDialogSubmit(action: (formData: FormData) => Promise<{ error?: string } | undefined>, onSuccess: () => void) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        onSuccess();
      }
    });
  };

  return { open, setOpen, error, isPending, submit };
}

export function CreateDirectorateDialog() {
  const { open, setOpen, error, isPending, submit } = useDialogSubmit(createDirectorateAction, () => toast.success("Directorate created"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Directorate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Directorate</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" disabled={isPending} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateJmcDialog({ directorates, fixedDirectorateId }: { directorates: Option[]; fixedDirectorateId?: string }) {
  const [directorateId, setDirectorateId] = useState(fixedDirectorateId ?? "");
  const { open, setOpen, error, isPending, submit } = useDialogSubmit(createJmcAction, () => toast.success("JMC created"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New JMC
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New JMC</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("directorateId", directorateId);
            submit(formData);
          }}
          className="space-y-4"
        >
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!fixedDirectorateId && (
            <div>
              <Label>Directorate *</Label>
              <Select value={directorateId} onValueChange={setDirectorateId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a directorate" />
                </SelectTrigger>
                <SelectContent>
                  {directorates.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="district">District</Label>
            <Input id="district" name="district" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" name="contactNumber" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" disabled={isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !directorateId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateCollegeDialog({
  jmcs,
  collegeTypes,
  fixedJmcId,
}: {
  jmcs: Option[];
  collegeTypes: Option[];
  fixedJmcId?: string;
}) {
  const [jmcId, setJmcId] = useState(fixedJmcId ?? "");
  const [collegeTypeId, setCollegeTypeId] = useState("");
  const { open, setOpen, error, isPending, submit } = useDialogSubmit(createCollegeAction, () => toast.success("College created"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New College
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New College</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            formData.set("jmcId", jmcId);
            formData.set("collegeTypeId", collegeTypeId);
            submit(formData);
          }}
          className="space-y-4"
        >
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!fixedJmcId && (
            <div>
              <Label>JMC *</Label>
              <Select value={jmcId} onValueChange={setJmcId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a JMC" />
                </SelectTrigger>
                <SelectContent>
                  {jmcs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>College Type *</Label>
            <Select value={collegeTypeId} onValueChange={setCollegeTypeId} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {collegeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="district">District</Label>
            <Input id="district" name="district" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" name="contactNumber" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" disabled={isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !jmcId || !collegeTypeId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type OrgKind = "directorate" | "jmc" | "college";
const TOGGLE_ACTIONS = {
  directorate: toggleDirectorateStatusAction,
  jmc: toggleJmcStatusAction,
  college: toggleCollegeStatusAction,
} as const;

export function ToggleOrgStatusButton({ kind, id, status }: { kind: OrgKind; id: string; status: "active" | "inactive" }) {
  const [isPending, startTransition] = useTransition();
  const action = TOGGLE_ACTIONS[kind];
  const nextStatus = status === "active" ? "inactive" : "active";

  const toggle = () => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", nextStatus);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(status === "active" ? "Deactivated" : "Activated");
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={toggle} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "active" ? "Deactivate" : "Activate"}
    </Button>
  );
}

export function ProvisionOrgAdminDialog({
  role,
  orgId,
  label,
}: {
  role: "directorate_admin" | "jmc_admin" | "college_admin";
  orgId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setUsername(null);
  };

  const submit = (formData: FormData) => {
    setError("");
    formData.set("role", role);
    formData.set("orgId", orgId);
    startTransition(async () => {
      const result = await provisionOrgAdminAction(formData);
      if (result.username) setUsername(result.username);
      else setError(result.error ?? "Something went wrong");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {label}</DialogTitle>
        </DialogHeader>
        {username ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              An invite email has been sent so they can set their own password. They&apos;ll log in with this
              username:
            </p>
            <p className="rounded-md bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900">{username}</p>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
        <form action={submit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" name="fullName" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" disabled={isPending} required />
          </div>
          <p className="text-sm text-gray-500">An invite email is sent; they set their own password.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invite
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
