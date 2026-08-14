"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveCourseFileReportAction } from "@/lib/actions/course-file";

type CourseOption = { id: string; label: string; semesterId: string; content: Record<string, string> };

const SECTIONS: { key: string; label: string }[] = [
  { key: "learningObjectives", label: "Course Learning Objectives" },
  { key: "weeklyContent", label: "Weekly Content Plan" },
  { key: "assessmentPlan", label: "Assessment Plan" },
  { key: "recommendedBooks", label: "Recommended Books" },
  { key: "teachingMethods", label: "Teaching Methods" },
];

export function CourseFileEditor({ courses }: { courses: CourseOption[] }) {
  const [courseId, setCourseId] = useState("");
  const course = courses.find((c) => c.id === courseId);

  if (courses.length === 0) {
    return <p className="py-8 text-center text-gray-500">No courses assigned yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Course</Label>
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
      {course && <ReportForm key={course.id} course={course} />}
    </div>
  );
}

function ReportForm({ course }: { course: CourseOption }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("courseId", course.id);
    formData.set("semesterId", course.semesterId);
    startTransition(async () => {
      const result = await saveCourseFileReportAction(formData);
      if (result?.error) setError(result.error);
      else toast.success("Course file report saved");
    });
  };

  return (
    <form action={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {SECTIONS.map((section) => (
        <div key={section.key}>
          <Label htmlFor={section.key}>{section.label}</Label>
          <Textarea
            id={section.key}
            name={section.key}
            rows={4}
            defaultValue={course.content[section.key] ?? ""}
            disabled={isPending}
          />
        </div>
      ))}
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Course File Report
      </Button>
    </form>
  );
}
