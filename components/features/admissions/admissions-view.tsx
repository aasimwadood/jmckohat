"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2, FileText, Upload, Download } from "lucide-react";
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
  getAdmissionDocumentsAction,
  uploadAdmissionDocumentAction,
  type AdmissionDocumentRow,
} from "@/lib/actions/admissions";
import { assignAdmissionShiftAction } from "@/lib/actions/shifts";
import { assignAdmissionPlacementAction } from "@/lib/actions/groups-sections";
import { generateAdmissionFeeVoucherAction } from "@/lib/actions/fees";
import { MERIT_CATEGORIES } from "@/lib/validations/admissions";
import type { AdmissionRow, AdmissionViewRole } from "./types";

const VOUCHER_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  unpaid: "secondary",
  verified: "default",
  canceled: "destructive",
};

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
  shifts,
  groups,
  sections,
  admissions,
}: {
  role: AdmissionViewRole;
  departmentId: string;
  academicSessionId: string | null;
  isEnabled: boolean;
  programs: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  sections: { id: string; name: string; groupId: string }[];
  admissions: AdmissionRow[];
}) {
  const canManageSettings = role === "department" || role === "admin" || role === "focal_person_intermediate";
  const canAddStudent = role === "department" || role === "faculty" || role === "admin" || role === "focal_person_intermediate";
  const canApproveFee = role === "administration" || role === "admin";
  const canAdmitOrCancel = role === "department" || role === "faculty" || role === "admin" || role === "focal_person_intermediate";
  const canUploadDocuments = role === "department" || role === "faculty" || role === "admin" || role === "focal_person_intermediate";

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
              <AddStudentDialog departmentId={departmentId} programs={programs} shifts={shifts} groups={groups} />
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
                <TableHead>Shift</TableHead>
                <TableHead>Group / Section</TableHead>
                <TableHead>Fee Voucher</TableHead>
                <TableHead>Documents</TableHead>
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
                    <ShiftCell admission={admission} shifts={shifts} canEdit={canAddStudent} />
                  </TableCell>
                  <TableCell>
                    <GroupSectionCell admission={admission} groups={groups} sections={sections} canEdit={canAddStudent} />
                  </TableCell>
                  <TableCell>
                    <FeeVoucherCell admission={admission} canGenerate={canAddStudent} />
                  </TableCell>
                  <TableCell>
                    <DocumentsDialog admission={admission} canUpload={canUploadDocuments} />
                  </TableCell>
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
                  <TableCell colSpan={9} className="py-8 text-center text-gray-500">
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

function AddStudentDialog({
  departmentId,
  programs,
  shifts,
  groups,
}: {
  departmentId: string;
  programs: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [meritCategory, setMeritCategory] = useState("open_merit");
  const [programId, setProgramId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("departmentId", departmentId);
    formData.set("meritCategory", meritCategory);
    formData.set("programId", programId);
    formData.set("shiftId", shiftId);
    formData.set("groupId", groupId);
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
            <Label htmlFor="fatherName">Father&apos;s Name</Label>
            <Input id="fatherName" name="fatherName" disabled={isPending} />
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
          {shifts.length > 0 && (
            <div>
              <Label>Shift</Label>
              <Select value={shiftId || "none"} onValueChange={(v) => setShiftId(v === "none" ? "" : v)} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {groups.length > 0 && (
            <div>
              <Label>Group</Label>
              <Select value={groupId || "none"} onValueChange={(v) => setGroupId(v === "none" ? "" : v)} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
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

function ShiftCell({
  admission,
  shifts,
  canEdit,
}: {
  admission: AdmissionRow;
  shifts: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const assign = (value: string) => {
    const formData = new FormData();
    formData.set("admissionId", admission.id);
    formData.set("shiftId", value === "none" ? "" : value);
    startTransition(async () => {
      const result = await assignAdmissionShiftAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Shift updated");
    });
  };

  if (!canEdit || shifts.length === 0) {
    return <span className="text-sm text-gray-600">{shifts.find((s) => s.id === admission.shiftId)?.name ?? "—"}</span>;
  }

  return (
    <Select value={admission.shiftId ?? "none"} onValueChange={assign} disabled={isPending}>
      <SelectTrigger className="h-8 w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {shifts.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GroupSectionCell({
  admission,
  groups,
  sections,
  canEdit,
}: {
  admission: AdmissionRow;
  groups: { id: string; name: string }[];
  sections: { id: string; name: string; groupId: string }[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingGroupId, setPendingGroupId] = useState(admission.groupId ?? "");

  const assign = (groupId: string, sectionId: string) => {
    const formData = new FormData();
    formData.set("admissionId", admission.id);
    formData.set("groupId", groupId);
    formData.set("sectionId", sectionId);
    startTransition(async () => {
      const result = await assignAdmissionPlacementAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Group/Section updated");
    });
  };

  const onGroupChange = (value: string) => {
    const groupId = value === "none" ? "" : value;
    setPendingGroupId(groupId);
    // Changing group always clears section — a section from the old group
    // can never be valid for the new one.
    assign(groupId, "");
  };

  const onSectionChange = (value: string) => {
    assign(pendingGroupId, value === "none" ? "" : value);
  };

  if (!canEdit || groups.length === 0) {
    const groupName = groups.find((g) => g.id === admission.groupId)?.name;
    const sectionName = sections.find((s) => s.id === admission.sectionId)?.name;
    return <span className="text-sm text-gray-600">{groupName ? `${groupName}${sectionName ? ` — ${sectionName}` : ""}` : "—"}</span>;
  }

  const sectionsForGroup = sections.filter((s) => s.groupId === pendingGroupId);

  return (
    <div className="flex flex-col gap-1">
      <Select value={pendingGroupId || "none"} onValueChange={onGroupChange} disabled={isPending}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Group" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pendingGroupId && (
        <Select value={admission.sectionId ?? "none"} onValueChange={onSectionChange} disabled={isPending || sectionsForGroup.length === 0}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {sectionsForGroup.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function FeeVoucherCell({ admission, canGenerate }: { admission: AdmissionRow; canGenerate: boolean }) {
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("admissionId", admission.id);
      const result = await generateAdmissionFeeVoucherAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Fee voucher generated");
    });
  };

  if (admission.voucher) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={VOUCHER_STATUS_VARIANT[admission.voucher.status]} className="capitalize">
          {admission.voucher.status}
        </Badge>
        <Button size="sm" variant="outline" asChild>
          <a href={`/api/fees/vouchers/${admission.voucher.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Download className="h-3 w-3" />
          </a>
        </Button>
      </div>
    );
  }

  if (admission.status === "pending" && canGenerate) {
    return (
      <Button size="sm" variant="outline" onClick={generate} disabled={isPending}>
        {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Generate Fee
      </Button>
    );
  }

  return <span className="text-sm text-gray-400">—</span>;
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

function DocumentsDialog({ admission, canUpload }: { admission: AdmissionRow; canUpload: boolean }) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<AdmissionDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = () => {
    setLoading(true);
    startTransition(async () => {
      const docs = await getAdmissionDocumentsAction(admission.id);
      setDocuments(docs);
      setLoading(false);
    });
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) load();
  };

  const onUpload = (formData: FormData) => {
    setError("");
    formData.set("admissionId", admission.id);
    formData.set("label", label);
    startTransition(async () => {
      const result = await uploadAdmissionDocumentAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setLabel("");
        load();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <FileText className="mr-2 h-4 w-4" />
          Documents
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Documents — {admission.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-lg border p-2">
                  <span className="text-sm font-medium">{doc.label}</span>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-blue-600 hover:underline"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      View
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">Unavailable</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canUpload && (
            <form action={onUpload} className="space-y-3 border-t pt-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div>
                <Label htmlFor={`label-${admission.id}`}>Document Label *</Label>
                <Input
                  id={`label-${admission.id}`}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. CNIC, Matric Certificate"
                  disabled={isPending}
                  required
                />
              </div>
              <div>
                <Label htmlFor={`file-${admission.id}`}>File * (PDF, PNG, JPEG — max 10MB)</Label>
                <Input id={`file-${admission.id}`} name="file" type="file" accept="application/pdf,image/png,image/jpeg" disabled={isPending} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
