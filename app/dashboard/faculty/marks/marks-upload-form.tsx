"use client";

import { useState, useTransition } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitResultAction } from "@/lib/actions/results";

type RosterEntry = {
  studentId: string;
  studentName: string;
  quiz1: number;
  quiz2: number;
  midterm: number;
  assignmentsScore: number;
  presentation: number;
};
type CourseOption = { id: string; label: string; semesterId: string; roster: RosterEntry[] };

export function MarksUploadForm({ courses }: { courses: CourseOption[] }) {
  const [courseId, setCourseId] = useState("");
  const course = courses.find((c) => c.id === courseId);

  if (courses.length === 0) {
    return <p className="py-8 text-center text-gray-500">No courses assigned yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label>Select Course:</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {course ? (
        course.roster.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No students enrolled in this course yet.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Internal (Quiz + Assignments + Presentation) is a shared 25-mark pool — split it however you like across
              those three, as long as they add up to 25 or less. Midterm is out of 25. The External Final (out of 50)
              is recorded separately by the Controller once the university issues it.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-20">Quiz 1</TableHead>
                  <TableHead className="w-20">Quiz 2</TableHead>
                  <TableHead className="w-24">Assignments</TableHead>
                  <TableHead className="w-24">Presentation</TableHead>
                  <TableHead className="w-28">Internal (/25)</TableHead>
                  <TableHead className="w-24">Midterm (/25)</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.roster.map((entry) => (
                  <MarkRow key={entry.studentId} entry={entry} courseId={course.id} semesterId={course.semesterId} />
                ))}
              </TableBody>
            </Table>
          </>
        )
      ) : (
        <div className="py-12 text-center text-gray-500">
          <Upload className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>Please select a course to start uploading marks.</p>
        </div>
      )}
    </div>
  );
}

function MarkRow({ entry, courseId, semesterId }: { entry: RosterEntry; courseId: string; semesterId: string }) {
  const [values, setValues] = useState(entry);
  const [isPending, startTransition] = useTransition();

  const internalTotal = values.quiz1 + values.quiz2 + values.assignmentsScore + values.presentation;
  const overCap = internalTotal > 25;

  const submit = () => {
    if (overCap) {
      toast.error(`Internal marks total ${internalTotal}, over the 25-mark pool`);
      return;
    }
    const formData = new FormData();
    formData.set("studentProfileId", entry.studentId);
    formData.set("courseId", courseId);
    formData.set("semesterId", semesterId);
    formData.set("quiz1", String(values.quiz1));
    formData.set("quiz2", String(values.quiz2));
    formData.set("midterm", String(values.midterm));
    formData.set("assignmentsScore", String(values.assignmentsScore));
    formData.set("presentation", String(values.presentation));
    startTransition(async () => {
      const result = await submitResultAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`Marks submitted for ${entry.studentName}`);
    });
  };

  // No fixed per-field cap — "distribution depends on teacher" — only the
  // combined internal pool (checked below and by the DB) is bounded.
  const field = (key: "quiz1" | "quiz2" | "assignmentsScore" | "presentation") => (
    <Input
      type="number"
      min={0}
      max={25}
      step="0.5"
      value={values[key]}
      onChange={(e) => setValues((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
      className="w-20"
      disabled={isPending}
    />
  );

  return (
    <TableRow>
      <TableCell>{entry.studentName}</TableCell>
      <TableCell>{field("quiz1")}</TableCell>
      <TableCell>{field("quiz2")}</TableCell>
      <TableCell>{field("assignmentsScore")}</TableCell>
      <TableCell>{field("presentation")}</TableCell>
      <TableCell className={overCap ? "font-bold text-destructive" : "font-bold"}>{internalTotal}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={25}
          step="0.5"
          value={values.midterm}
          onChange={(e) => setValues((prev) => ({ ...prev, midterm: Number(e.target.value) || 0 }))}
          className="w-20"
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Button size="sm" onClick={submit} disabled={isPending || overCap}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
