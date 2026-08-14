"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  createAdmissionAction,
  approveAdmissionFeeAction,
  admitStudentAction,
  cancelAdmissionAction,
  toggleAdmissionSettingsAction,
} from "@/lib/actions/admissions";
import { MERIT_CATEGORIES } from "@/lib/validations/admissions";
import type { AdmissionRow, AdmissionViewRole } from "./types";

const MERIT_LABELS: Record<string, string> = {
  open_merit: "Open Merit",
  local_area: "Local Area",
  special_merit: "Special Merit",
  sports_quota: "Sports Quota",
  college_employee_child: "College Employee Child",
  minority_quota: "Minority Quota",
  disabled_person_quota: "Disabled Person Quota",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  fee_approved: "outline",
  admitted: "default",
  canceled: "destructive",
};

export function AdmissionsView({
  role,
  departmentId,
  academicSessionId,
  isEnabled,
  programs,
  admissions,
}: {
  role: AdmissionViewRole;
  departmentId: string;
  academicSessionId: string | null;
  isEnabled: boolean;
  programs: { id: string; name: string }[];
  admissions: AdmissionRow[];
}) {
  const canManageSettings = role === "department" || role === "admin";
  const canAddStudent = role === "department" || role === "faculty" || role === "admin";
  const canApproveFee = role === "administration" || role === "admin";
  const canAdmitOrCancel = role === "department" || role === "faculty" || role === "admin";

  return (
    <div className="space-y-6">
      {canManageSettings && academicSessionId && (
        <AdmissionSettingsCard departmentId={departmentId} academicSessionId={academicSessionId} isEnabled={isEnabled} />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admissions</CardTitle>
            {canAddStudent && isEnabled && (
              <AddStudentDialog departmentId={departmentId} programs={programs} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEnabled && (
            <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              Admissions are currently disabled for this department/session.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Merit Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reg. #</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell>
                    <p className="font-medium">{admission.fullName}</p>
                    <p className="text-xs text-gray-500">{admission.email ?? admission.temporaryId}</p>
                  </TableCell>
                  <TableCell>{MERIT_LABELS[admission.meritCategory]}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[admission.status]} className="capitalize">
                      {admission.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{admission.registrationNumber ?? "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      admission={admission}
                      canApproveFee={canApproveFee}
                      canAdmitOrCancel={canAdmitOrCancel}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {admissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No admission records yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AdmissionSettingsCard({
  departmentId,
  academicSessionId,
  isEnabled,
}: {
  departmentId: string;
  academicSessionId: string;
  isEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await toggleAdmissionSettingsAction(departmentId, academicSessionId, !isEnabled);
      if (result?.error) toast.error(result.error);
      else toast.success(isEnabled ? "Admissions disabled" : "Admissions enabled");
    });
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="font-medium text-gray-900">Admission Module</p>
          <p className="text-sm text-gray-500">{isEnabled ? "Currently enabled" : "Currently disabled"}</p>
        </div>
        <Button onClick={toggle} disabled={isPending} variant={isEnabled ? "outline" : "default"}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEnabled ? "Disable" : "Enable"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AddStudentDialog({ departmentId, programs }: { departmentId: string; programs: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [meritCategory, setMeritCategory] = useState("open_merit");
  const [programId, setProgramId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("departmentId", departmentId);
    formData.set("meritCategory", meritCategory);
    formData.set("programId", programId);
    startTransition(async () => {
      const result = await createAdmissionAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Admission</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" name="fullName" disabled={isPending} required />
          </div>
          <div>
            <Label htmlFor="cnic">CNIC</Label>
            <Input id="cnic" name="cnic" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" name="contactNumber" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" disabled={isPending} />
          </div>
          {programs.length > 0 && (
            <div>
              <Label>Program</Label>
              <Select value={programId} onValueChange={setProgramId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Merit Category</Label>
            <Select value={meritCategory} onValueChange={setMeritCategory} disabled={isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MERIT_CATEGORIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MERIT_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="meritNumber">Merit Number</Label>
            <Input id="meritNumber" name="meritNumber" type="number" disabled={isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({
  admission,
  canApproveFee,
  canAdmitOrCancel,
}: {
  admission: AdmissionRow;
  canApproveFee: boolean;
  canAdmitOrCancel: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const admit = () => {
    startTransition(async () => {
      const result = await admitStudentAction(admission.id);
      if (result?.error) toast.error(result.error);
      else toast.success(`${admission.fullName} admitted`);
    });
  };

  if (admission.status === "pending" && canApproveFee) {
    return (
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <Button size="sm" onClick={() => setReceiptOpen(true)}>
          Verify Fee
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Fee — {admission.fullName}</DialogTitle>
          </DialogHeader>
          <form
            action={(formData) => {
              formData.set("admissionId", admission.id);
              startTransition(async () => {
                const result = await approveAdmissionFeeAction(formData);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Fee verified");
                  setReceiptOpen(false);
                }
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="receiptNumber">Receipt Number *</Label>
              <Input id="receiptNumber" name="receiptNumber" disabled={isPending} required />
            </div>
            <p className="text-sm text-gray-600">Total fee: PKR {admission.totalFee.toLocaleString()}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceiptOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (admission.status === "fee_approved" && canAdmitOrCancel) {
    return (
      <Button size="sm" onClick={admit} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm Admission
      </Button>
    );
  }

  if (admission.status === "admitted" && canAdmitOrCancel) {
    return (
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <Button size="sm" variant="outline" className="text-red-600" onClick={() => setCancelOpen(true)}>
          Cancel
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Admission — {admission.fullName}</DialogTitle>
          </DialogHeader>
          <form
            action={(formData) => {
              formData.set("admissionId", admission.id);
              startTransition(async () => {
                const result = await cancelAdmissionAction(formData);
                if (result?.error) toast.error(result.error);
                else {
                  toast.success("Admission canceled");
                  setCancelOpen(false);
                }
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Input id="reason" name="reason" disabled={isPending} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>
                Back
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return <span className="text-sm text-gray-400">—</span>;
}
