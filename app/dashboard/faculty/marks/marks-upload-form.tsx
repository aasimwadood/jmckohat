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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-24">Quiz 1 (/7.5)</TableHead>
                <TableHead className="w-24">Quiz 2 (/7.5)</TableHead>
                <TableHead className="w-24">Midterm (/30)</TableHead>
                <TableHead className="w-24">Assignments (/15)</TableHead>
                <TableHead className="w-24">Total (/60)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.roster.map((entry) => (
                <MarkRow key={entry.studentId} entry={entry} courseId={course.id} semesterId={course.semesterId} />
              ))}
            </TableBody>
          </Table>
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

  const total = values.quiz1 + values.quiz2 + values.midterm + values.assignmentsScore;

  const submit = () => {
    const formData = new FormData();
    formData.set("studentProfileId", entry.studentId);
    formData.set("courseId", courseId);
    formData.set("semesterId", semesterId);
    formData.set("quiz1", String(values.quiz1));
    formData.set("quiz2", String(values.quiz2));
    formData.set("midterm", String(values.midterm));
    formData.set("assignmentsScore", String(values.assignmentsScore));
    startTransition(async () => {
      const result = await submitResultAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`Marks submitted for ${entry.studentName}`);
    });
  };

  const field = (key: keyof RosterEntry, max: number) => (
    <Input
      type="number"
      min={0}
      max={max}
      step="0.5"
      value={values[key]}
      onChange={(e) => setValues((prev) => ({ ...prev, [key]: Math.min(Number(e.target.value) || 0, max) }))}
      className="w-20"
      disabled={isPending}
    />
  );

  return (
    <TableRow>
      <TableCell>{entry.studentName}</TableCell>
      <TableCell>{field("quiz1", 7.5)}</TableCell>
      <TableCell>{field("quiz2", 7.5)}</TableCell>
      <TableCell>{field("midterm", 30)}</TableCell>
      <TableCell>{field("assignmentsScore", 15)}</TableCell>
      <TableCell className="font-bold">{total}</TableCell>
      <TableCell>
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
