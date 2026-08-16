"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTeacherAction, removeTeacherAssignmentAction } from "@/lib/actions/curriculum";

type Teacher = { id: string; name: string };
type Semester = { id: string; number: number };
type Assignment = { facultyProfileId: string; facultyName: string; semesterId: string; semesterNumber: number };

export function CourseTeachers({
  courseId,
  teachers,
  semesters,
  assignments,
}: {
  courseId: string;
  teachers: Teacher[];
  semesters: Semester[];
  assignments: Assignment[];
}) {
  const [teacherId, setTeacherId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [isPending, startTransition] = useTransition();

  const onAssign = () => {
    if (!teacherId || !semesterId) {
      toast.error("Select a teacher and semester");
      return;
    }
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("facultyProfileId", teacherId);
    formData.set("semesterId", semesterId);
    startTransition(async () => {
      const result = await assignTeacherAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Teacher assigned");
        setTeacherId("");
        setSemesterId("");
      }
    });
  };

  const onRemove = (facultyProfileId: string, semId: string) => {
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("facultyProfileId", facultyProfileId);
    formData.set("semesterId", semId);
    startTransition(async () => {
      const result = await removeTeacherAssignmentAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Assignment removed");
    });
  };

  return (
    <div className="mt-2 space-y-2 border-t pt-2">
      <div className="flex flex-wrap gap-2">
        {assignments.map((a) => (
          <Badge key={`${a.facultyProfileId}-${a.semesterId}`} variant="secondary" className="gap-1">
            {a.facultyName} — Sem {a.semesterNumber}
            <button
              type="button"
              onClick={() => onRemove(a.facultyProfileId, a.semesterId)}
              disabled={isPending}
              className="ml-1 rounded-full hover:bg-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {assignments.length === 0 && <span className="text-xs text-gray-400">No teacher assigned yet.</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={teacherId} onValueChange={setTeacherId} disabled={isPending}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={semesterId} onValueChange={setSemesterId} disabled={isPending}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Semester {s.number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={onAssign} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
