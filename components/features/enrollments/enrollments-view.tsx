"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enrollStudentsAction, updateEnrollmentStatusAction } from "@/lib/actions/enrollments";

type Course = { id: string; code: string; title: string };
type Semester = { id: string; label: string };
type Student = { id: string; name: string; username: string };
type EnrollmentRow = { id: string; studentName: string; courseLabel: string; semesterNumber: number; status: string };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  completed: "secondary",
  dropped: "destructive",
};

export function EnrollmentsView({
  courses,
  semesters,
  students,
  enrollments,
}: {
  courses: Course[];
  semesters: Semester[];
  students: Student[];
  enrollments: EnrollmentRow[];
}) {
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onEnroll = () => {
    if (!courseId || !semesterId || selected.size === 0) {
      toast.error("Select a course, semester, and at least one student");
      return;
    }
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("semesterId", semesterId);
    selected.forEach((id) => formData.append("studentProfileIds", id));
    startTransition(async () => {
      const result = await enrollStudentsAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(`Enrolled ${selected.size} student(s)`);
        setSelected(new Set());
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enroll Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Students</Label>
            {students.length === 0 ? (
              <p className="text-sm text-gray-500">No students in this department yet.</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-3">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-1">
                    <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} id={`student-${s.id}`} />
                    <Label htmlFor={`student-${s.id}`} className="cursor-pointer font-normal">
                      {s.name} <span className="text-xs text-gray-500">@{s.username}</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={onEnroll} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Enroll ${selected.size || ""} Selected`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No enrollments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => (
                    <EnrollmentRowItem key={e.id} enrollment={e} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EnrollmentRowItem({ enrollment }: { enrollment: EnrollmentRow }) {
  const [isPending, startTransition] = useTransition();

  const onChangeStatus = (status: string) => {
    const formData = new FormData();
    formData.set("enrollmentId", enrollment.id);
    formData.set("status", status);
    startTransition(async () => {
      const result = await updateEnrollmentStatusAction(formData);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <TableRow>
      <TableCell>{enrollment.studentName}</TableCell>
      <TableCell>{enrollment.courseLabel}</TableCell>
      <TableCell>Semester {enrollment.semesterNumber}</TableCell>
      <TableCell>
        <Select value={enrollment.status} onValueChange={onChangeStatus} disabled={isPending}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue>
              <Badge variant={STATUS_VARIANT[enrollment.status] ?? "default"} className="capitalize">
                {enrollment.status}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}
