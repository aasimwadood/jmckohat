"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enrollStudentsAction, updateEnrollmentStatusAction } from "@/lib/actions/enrollments";

type Course = { id: string; code: string; title: string };
type Student = { id: string; name: string; username: string; batch: string | null; semesterNumber: number | null };
type EnrollmentRow = { id: string; studentName: string; courseLabel: string; semesterNumber: number; status: string };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  completed: "secondary",
  dropped: "destructive",
};

const SEMESTER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function EnrollmentsView({
  courses,
  students,
  enrollments,
}: {
  courses: Course[];
  students: Student[];
  enrollments: EnrollmentRow[];
}) {
  const [courseId, setCourseId] = useState("");
  const [batch, setBatch] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const batches = useMemo(
    () => [...new Set(students.map((s) => s.batch).filter((b): b is string => !!b))].sort().reverse(),
    [students],
  );

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (batch && s.batch !== batch) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, batch, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onEnroll = () => {
    if (!courseId || selected.size === 0) {
      toast.error("Select a course and at least one student");
      return;
    }
    const formData = new FormData();
    formData.set("courseId", courseId);
    selected.forEach((id) => formData.append("studentProfileIds", id));
    startTransition(async () => {
      const result = await enrollStudentsAction(formData);
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      const enrolledCount = result.enrolledCount ?? 0;
      const skippedCount = result.skippedCount ?? 0;
      toast.success(
        skippedCount > 0
          ? `Enrolled ${enrolledCount} student(s) — ${skippedCount} skipped (no current semester set)`
          : `Enrolled ${enrolledCount} student(s)`,
      );
      setSelected(new Set());
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
              <Label>Batch</Label>
              <Select value={batch || "all"} onValueChange={(v) => setBatch(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Students</Label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {visibleStudents.length === 0 ? (
              <p className="text-sm text-gray-500">No students match this filter.</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-3">
                {visibleStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-1">
                    <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} id={`student-${s.id}`} />
                    <Label htmlFor={`student-${s.id}`} className="flex-1 cursor-pointer font-normal">
                      {s.name} <span className="text-xs text-gray-500">@{s.username}</span>
                    </Label>
                    {s.batch && (
                      <Badge variant="outline" className="text-xs">
                        {s.batch}
                      </Badge>
                    )}
                    {s.semesterNumber && (
                      <Badge variant="secondary" className="text-xs">
                        Sem {s.semesterNumber}
                      </Badge>
                    )}
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
          <CurrentEnrollmentsTabs enrollments={enrollments} />
        </CardContent>
      </Card>
    </div>
  );
}

function CurrentEnrollmentsTabs({ enrollments }: { enrollments: EnrollmentRow[] }) {
  const [search, setSearch] = useState("");

  const byCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of enrollments) counts.set(e.semesterNumber, (counts.get(e.semesterNumber) ?? 0) + 1);
    return counts;
  }, [enrollments]);

  const defaultTab = String(SEMESTER_NUMBERS.find((n) => (byCount.get(n) ?? 0) > 0) ?? 1);

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
        {SEMESTER_NUMBERS.map((n) => (
          <TabsTrigger
            key={n}
            value={String(n)}
            className="flex-none rounded-full border border-gray-200 bg-white px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:text-white"
          >
            Semester {n}
            {(byCount.get(n) ?? 0) > 0 && <span className="ml-1.5 text-xs opacity-75">({byCount.get(n)})</span>}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm pl-8"
        />
      </div>

      {SEMESTER_NUMBERS.map((n) => {
        const q = search.trim().toLowerCase();
        const rows = enrollments.filter(
          (e) => e.semesterNumber === n && (!q || e.studentName.toLowerCase().includes(q)),
        );
        return (
          <TabsContent key={n} value={String(n)}>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                {search ? "No matching students." : "No enrollments in this semester yet."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((e) => (
                      <EnrollmentRowItem key={e.id} enrollment={e} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
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
