"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { markAttendanceAction } from "@/lib/actions/attendance";

type RosterEntry = { id: string; name: string };

export function MarkAttendanceForm({
  courseId,
  semesterId,
  roster,
}: {
  courseId: string;
  semesterId: string;
  roster: RosterEntry[];
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [present, setPresent] = useState<Set<string>>(new Set(roster.map((r) => r.id)));
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = () => {
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("semesterId", semesterId);
    formData.set("sessionDate", date);
    roster.forEach((r) => {
      formData.append("studentId", r.id);
      if (present.has(r.id)) formData.set(`present-${r.id}`, "on");
    });
    startTransition(async () => {
      const result = await markAttendanceAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Attendance submitted successfully!");
    });
  };

  if (roster.length === 0) {
    return <p className="py-6 text-center text-gray-500">No students enrolled in this course yet.</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <Label htmlFor="attendance-date">Date</Label>
        <Input
          id="attendance-date"
          type="date"
          className="max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isPending}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Present</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((student) => (
            <TableRow key={student.id}>
              <TableCell>{student.name}</TableCell>
              <TableCell>
                <Checkbox checked={present.has(student.id)} onCheckedChange={() => toggle(student.id)} disabled={isPending} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Attendance
        </Button>
      </div>
    </div>
  );
}
