"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createExamScheduleAction } from "@/lib/actions/exam-schedules";

type Course = { id: string; code: string; title: string; department_id: string };
type Department = { id: string; name: string };
type Semester = { id: string; number: number };

export function CreateExamScheduleDialog({
  courses,
  departments,
  semesters,
}: {
  courses: Course[];
  departments: Department[];
  semesters: Semester[];
}) {
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredCourses = courses.filter((c) => !departmentId || c.department_id === departmentId);

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("courseId", courseId);
    formData.set("semesterId", semesterId);
    startTransition(async () => {
      const result = await createExamScheduleAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Schedule</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Exam Schedule</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setCourseId(""); }} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
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
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId} disabled={isPending || !departmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Semester</Label>
            <Select value={semesterId} onValueChange={setSemesterId} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Semester {s.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="examDate">Date</Label>
              <Input id="examDate" name="examDate" type="date" disabled={isPending} required />
            </div>
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" name="startTime" type="time" disabled={isPending} required />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" name="endTime" type="time" disabled={isPending} required />
            </div>
          </div>
          <div>
            <Label htmlFor="room">Room</Label>
            <Input id="room" name="room" disabled={isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
