"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateApplicationAcademicAction,
  addApplicationExperienceAction,
  deleteApplicationExperienceAction,
  uploadApplicationDocumentAction,
  deleteApplicationDocumentAction,
  submitApplicationAction,
} from "@/lib/actions/recruitment-applicant";
import type { ApplicationDocumentRow } from "@/lib/actions/recruitment-applicant";
import type { RecruitmentApplicationStatusEnum } from "@/types/database.types";

type Academic = {
  qualification: string | null;
  degree: string | null;
  institution: string | null;
  subject: string | null;
  yearOfCompletion: number | null;
  marksObtained: number | null;
  totalMarks: number | null;
  percentageCgpa: number | null;
};
type Experience = {
  id: string;
  organization: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};
type RequiredDoc = { id: string; documentType: string; isMandatory: boolean };

export function ApplicationFormView({
  applicationId,
  positionTitle,
  status,
  academic,
  experience,
  requiredDocuments,
  documents,
}: {
  applicationId: string;
  positionTitle: string;
  status: RecruitmentApplicationStatusEnum;
  academic: Academic;
  experience: Experience[];
  requiredDocuments: RequiredDoc[];
  documents: ApplicationDocumentRow[];
}) {
  const router = useRouter();

  if (status !== "draft") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="mb-2 text-gray-700">This application has already been submitted.</p>
          <Button onClick={() => router.push(`/recruitment/portal/applications/${applicationId}`)}>View Application</Button>
        </CardContent>
      </Card>
    );
  }

  const missingMandatory = requiredDocuments.filter(
    (rd) => rd.isMandatory && !documents.some((d) => d.documentType === rd.documentType),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Apply — {positionTitle}</h1>
        <Badge variant="outline" className="mt-1 capitalize">
          Draft
        </Badge>
      </div>

      <AcademicSection applicationId={applicationId} academic={academic} />
      <ExperienceSection applicationId={applicationId} experience={experience} />
      <DocumentsSection applicationId={applicationId} requiredDocuments={requiredDocuments} documents={documents} />

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="text-sm text-gray-500">
            {missingMandatory.length > 0
              ? `Missing mandatory documents: ${missingMandatory.map((d) => d.documentType).join(", ")}`
              : "All mandatory documents uploaded."}
          </div>
          <SubmitButton applicationId={applicationId} disabled={missingMandatory.length > 0} />
        </CardContent>
      </Card>
    </div>
  );
}

function AcademicSection({ applicationId, academic }: { applicationId: string; academic: Academic }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("applicationId", applicationId);
    startTransition(async () => {
      const result = await updateApplicationAcademicAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Academic information saved");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="qualification">Qualification</Label>
            <Input id="qualification" name="qualification" defaultValue={academic.qualification ?? ""} />
          </div>
          <div>
            <Label htmlFor="degree">Degree</Label>
            <Input id="degree" name="degree" defaultValue={academic.degree ?? ""} />
          </div>
          <div>
            <Label htmlFor="institution">Institution</Label>
            <Input id="institution" name="institution" defaultValue={academic.institution ?? ""} />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" defaultValue={academic.subject ?? ""} />
          </div>
          <div>
            <Label htmlFor="yearOfCompletion">Year of Completion</Label>
            <Input id="yearOfCompletion" name="yearOfCompletion" type="number" defaultValue={academic.yearOfCompletion ?? ""} />
          </div>
          <div>
            <Label htmlFor="percentageCgpa">Percentage / CGPA</Label>
            <Input id="percentageCgpa" name="percentageCgpa" type="number" step="0.01" defaultValue={academic.percentageCgpa ?? ""} />
          </div>
          <div>
            <Label htmlFor="marksObtained">Marks Obtained</Label>
            <Input id="marksObtained" name="marksObtained" type="number" defaultValue={academic.marksObtained ?? ""} />
          </div>
          <div>
            <Label htmlFor="totalMarks">Total Marks</Label>
            <Input id="totalMarks" name="totalMarks" type="number" defaultValue={academic.totalMarks ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ExperienceSection({ applicationId, experience }: { applicationId: string; experience: Experience[] }) {
  const [isPending, startTransition] = useTransition();

  const onAdd = (formData: FormData) => {
    formData.set("applicationId", applicationId);
    startTransition(async () => {
      const result = await addApplicationExperienceAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Experience added");
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteApplicationExperienceAction(id);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {experience.length > 0 && (
          <ul className="space-y-2">
            {experience.map((e) => (
              <li key={e.id} className="flex items-start justify-between rounded border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {e.position} — {e.organization}
                  </p>
                  <p className="text-gray-500">
                    {e.startDate ?? "?"} – {e.isCurrent ? "Present" : (e.endDate ?? "?")}
                  </p>
                  {e.description && <p className="mt-1 text-gray-600">{e.description}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDelete(e.id)} disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form action={onAdd} className="space-y-3 rounded border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input id="organization" name="organization" required />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input id="position" name="position" required />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isCurrent" name="isCurrent" />
            <Label htmlFor="isCurrent" className="text-sm">
              I currently work here
            </Label>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Experience"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentsSection({
  applicationId,
  requiredDocuments,
  documents,
}: {
  applicationId: string;
  requiredDocuments: RequiredDoc[];
  documents: ApplicationDocumentRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requiredDocuments.map((rd) => {
          const existing = documents.find((d) => d.documentType === rd.documentType);
          return (
            <DocumentRow key={rd.id} applicationId={applicationId} requiredDoc={rd} existing={existing} />
          );
        })}
        {requiredDocuments.length === 0 && <p className="text-sm text-gray-500">No documents required for this position.</p>}
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  applicationId,
  requiredDoc,
  existing,
}: {
  applicationId: string;
  requiredDoc: RequiredDoc;
  existing?: ApplicationDocumentRow;
}) {
  const [isPending, startTransition] = useTransition();

  const onUpload = (formData: FormData) => {
    formData.set("applicationId", applicationId);
    formData.set("documentType", requiredDoc.documentType);
    startTransition(async () => {
      const result = await uploadApplicationDocumentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Document uploaded");
    });
  };

  const onDelete = () => {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteApplicationDocumentAction(existing.id);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
      <div>
        <p className="text-sm font-medium">
          {requiredDoc.documentType} {requiredDoc.isMandatory && <span className="text-red-600">*</span>}
        </p>
        {existing?.url && (
          <a href={existing.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:underline">
            View uploaded file <ExternalLink className="ml-0.5 h-3 w-3" />
          </a>
        )}
      </div>
      {existing ? (
        <Button variant="outline" size="sm" onClick={onDelete} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove & Replace"}
        </Button>
      ) : (
        <form action={onUpload} className="flex items-center gap-2">
          <Input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required className="h-9 w-56" />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
        </form>
      )}
    </div>
  );
}

function SubmitButton({ applicationId, disabled }: { applicationId: string; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    startTransition(async () => {
      const result = await submitApplicationAction(applicationId);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Application submitted");
        router.push(`/recruitment/portal/applications/${applicationId}`);
      }
    });
  };

  return (
    <Button onClick={onSubmit} disabled={disabled || isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
    </Button>
  );
}
