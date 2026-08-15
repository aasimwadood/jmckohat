"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  createPositionAction,
  createMeritCriterionAction,
  createRequiredDocumentAction,
  updateAdvertisementStatusAction,
} from "@/lib/actions/recruitment";
import { RECRUITMENT_AD_STATUSES } from "@/lib/validations/recruitment";
import type { PositionRow, MeritCriterionRow, RequiredDocumentRow } from "./types";
import type { RecruitmentAdStatusEnum } from "@/types/database.types";

type Advertisement = {
  id: string;
  title: string;
  adNumber: string | null;
  adDate: string;
  openingDate: string;
  closingDate: string;
  interviewDate: string | null;
  location: string | null;
  description: string | null;
  instructions: string | null;
  status: RecruitmentAdStatusEnum;
};

export function AdvertisementDetailView({
  advertisement,
  positions,
  criteriaByPosition,
  docsByPosition,
  departments,
  canIssueAppointments,
}: {
  advertisement: Advertisement;
  positions: PositionRow[];
  criteriaByPosition: Record<string, MeritCriterionRow[]>;
  docsByPosition: Record<string, RequiredDocumentRow[]>;
  departments: { id: string; name: string }[];
  canIssueAppointments: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link href="/dashboard/recruitment" className="text-sm text-blue-600 hover:underline">
          ← All Advertisements
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{advertisement.title}</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                {advertisement.adNumber ? `Ad #${advertisement.adNumber} · ` : ""}
                {new Date(advertisement.openingDate).toLocaleDateString()} – {new Date(advertisement.closingDate).toLocaleDateString()}
              </p>
            </div>
            <StatusSelector advertisementId={advertisement.id} status={advertisement.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {advertisement.location && <p><span className="font-medium">Location:</span> {advertisement.location}</p>}
          {advertisement.description && <p>{advertisement.description}</p>}
          {advertisement.instructions && (
            <p className="text-gray-500"><span className="font-medium text-gray-700">Instructions:</span> {advertisement.instructions}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Positions</CardTitle>
            <AddPositionDialog advertisementId={advertisement.id} departments={departments} />
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No positions yet — add one to start collecting applications.</p>
          ) : (
            <div className="space-y-3">
              {positions.map((p) => (
                <PositionCard
                  key={p.id}
                  position={p}
                  adId={advertisement.id}
                  canIssueAppointments={canIssueAppointments}
                  criteria={criteriaByPosition[p.id] ?? []}
                  requiredDocs={docsByPosition[p.id] ?? []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusSelector({ advertisementId, status }: { advertisementId: string; status: RecruitmentAdStatusEnum }) {
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const formData = new FormData();
    formData.set("advertisementId", advertisementId);
    formData.set("status", value);
    startTransition(async () => {
      const result = await updateAdvertisementStatusAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Status updated");
    });
  };

  return (
    <Select defaultValue={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-56 capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RECRUITMENT_AD_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">
            {s.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PositionCard({
  position,
  adId,
  canIssueAppointments,
  criteria,
  requiredDocs,
}: {
  position: PositionRow;
  adId: string;
  canIssueAppointments: boolean;
  criteria: MeritCriterionRow[];
  requiredDocs: RequiredDocumentRow[];
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">
            {position.title} {position.bpsGrade && <span className="text-sm text-gray-500">({position.bpsGrade})</span>}
          </p>
          <p className="text-sm text-gray-500">
            {position.departmentName ?? "No department"} · {position.vacancies} vacanc{position.vacancies === 1 ? "y" : "ies"}
          </p>
          {position.requiredQualification && (
            <p className="mt-1 text-xs text-gray-500">Qualification: {position.requiredQualification}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfigurePositionDialog position={position} criteria={criteria} requiredDocs={requiredDocs} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/recruitment/${adId}/positions/${position.id}/applications`}>Applications</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/recruitment/${adId}/positions/${position.id}/interviews`}>Interviews</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/recruitment/${adId}/positions/${position.id}/selection`}>
              {canIssueAppointments ? "Selection & Appointments" : "Selection"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddPositionDialog({ advertisementId, departments }: { advertisementId: string; departments: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("advertisementId", advertisementId);
    startTransition(async () => {
      const result = await createPositionAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Position added");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Position</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Position</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Position Title</Label>
            <Input id="title" name="title" placeholder="e.g. Lecturer Computer Science" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <Select name="departmentId">
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Select" />
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
              <Label htmlFor="bpsGrade">BPS / Grade</Label>
              <Input id="bpsGrade" name="bpsGrade" placeholder="e.g. BPS-18" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vacancies">Vacancies</Label>
              <Input id="vacancies" name="vacancies" type="number" min={1} defaultValue={1} required />
            </div>
            <div>
              <Label htmlFor="interviewShortlistPerVacancy">Shortlist / Vacancy</Label>
              <Input id="interviewShortlistPerVacancy" name="interviewShortlistPerVacancy" type="number" min={1} defaultValue={5} />
            </div>
          </div>
          <div>
            <Label htmlFor="requiredQualification">Required Qualification</Label>
            <Input id="requiredQualification" name="requiredQualification" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="requiredDegree">Required Degree</Label>
              <Input id="requiredDegree" name="requiredDegree" />
            </div>
            <div>
              <Label htmlFor="requiredSubject">Required Subject</Label>
              <Input id="requiredSubject" name="requiredSubject" />
            </div>
          </div>
          <div>
            <Label htmlFor="requiredExperience">Required Experience</Label>
            <Input id="requiredExperience" name="requiredExperience" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ageLimit">Age Limit</Label>
              <Input id="ageLimit" name="ageLimit" />
            </div>
            <div>
              <Label htmlFor="genderRequirement">Gender</Label>
              <Input id="genderRequirement" name="genderRequirement" placeholder="Any" />
            </div>
            <div>
              <Label htmlFor="domicileRequirement">Domicile</Label>
              <Input id="domicileRequirement" name="domicileRequirement" />
            </div>
          </div>
          <div>
            <Label htmlFor="otherCriteria">Other Criteria</Label>
            <Textarea id="otherCriteria" name="otherCriteria" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfigurePositionDialog({
  position,
  criteria,
  requiredDocs,
}: {
  position: PositionRow;
  criteria: MeritCriterionRow[];
  requiredDocs: RequiredDocumentRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{position.title} — Merit Criteria & Documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <MeritCriteriaSection positionId={position.id} criteria={criteria} />
          <RequiredDocumentsSection positionId={position.id} requiredDocs={requiredDocs} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MeritCriteriaSection({ positionId, criteria }: { positionId: string; criteria: MeritCriterionRow[] }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("positionId", positionId);
    startTransition(async () => {
      const result = await createMeritCriterionAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Criterion added — reopen this dialog to see the updated list");
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-900">Merit Criteria</p>
      <p className="mb-3 text-xs text-gray-500">
        Define the weighted components (e.g. Academic, Experience) used to compute the merit list. Interview marks are added
        automatically at the selection stage.
      </p>
      {criteria.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {criteria.map((c) => (
            <li key={c.id} className="flex justify-between rounded border px-2 py-1">
              <span>{c.name}</span>
              <span className="text-gray-500">/{c.maxScore}</span>
            </li>
          ))}
        </ul>
      )}
      <form action={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor={`criterion-name-${positionId}`} className="text-xs">
            Name
          </Label>
          <Input id={`criterion-name-${positionId}`} name="name" placeholder="e.g. Academic" required />
        </div>
        <div className="w-24">
          <Label htmlFor={`criterion-score-${positionId}`} className="text-xs">
            Max Score
          </Label>
          <Input id={`criterion-score-${positionId}`} name="maxScore" type="number" min={1} step="0.5" required />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </form>
    </div>
  );
}

function RequiredDocumentsSection({ positionId, requiredDocs }: { positionId: string; requiredDocs: RequiredDocumentRow[] }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("positionId", positionId);
    formData.set("isMandatory", formData.get("isMandatory") === "on" ? "true" : "false");
    startTransition(async () => {
      const result = await createRequiredDocumentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Document requirement added — reopen this dialog to see the updated list");
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-900">Required Documents</p>
      {requiredDocs.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {requiredDocs.map((d) => (
            <li key={d.id} className="flex justify-between rounded border px-2 py-1">
              <span>{d.documentType}</span>
              <span className="text-gray-500">{d.isMandatory ? "Mandatory" : "Optional"}</span>
            </li>
          ))}
        </ul>
      )}
      <form action={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor={`doc-type-${positionId}`} className="text-xs">
            Document Type
          </Label>
          <Input id={`doc-type-${positionId}`} name="documentType" placeholder="e.g. CNIC, Degree, CV" required />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox id={`doc-mandatory-${positionId}`} name="isMandatory" defaultChecked />
          <Label htmlFor={`doc-mandatory-${positionId}`} className="text-xs">
            Mandatory
          </Label>
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </form>
    </div>
  );
}
