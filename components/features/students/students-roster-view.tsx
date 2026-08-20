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
import { bulkAssignStudentShiftAction, bulkAssignStudentPlacementAction } from "@/lib/actions/students";

export type StudentRow = {
  id: string;
  name: string;
  username: string;
  batch: string | null;
  shiftId: string | null;
  groupId: string | null;
  sectionId: string | null;
};

export function StudentsRosterView({
  students,
  shifts,
  groups,
  sections,
}: {
  students: StudentRow[];
  shifts: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  sections: { id: string; name: string; groupId: string }[];
}) {
  const [search, setSearch] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [bulkSectionId, setBulkSectionId] = useState("");
  const [isPending, startTransition] = useTransition();

  const shiftName = useMemo(() => new Map(shifts.map((s) => [s.id, s.name])), [shifts]);
  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const sectionName = useMemo(() => new Map(sections.map((s) => [s.id, s.name])), [sections]);
  const sectionsForBulkGroup = useMemo(() => sections.filter((s) => s.groupId === bulkGroupId), [sections, bulkGroupId]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (unassignedOnly) {
        const missingShift = !s.shiftId;
        const missingGroup = groups.length > 0 && !s.groupId;
        if (!missingShift && !missingGroup) return false;
      }
      return true;
    });
  }, [students, search, unassignedOnly, groups.length]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const allSelected = visibleStudents.length > 0 && visibleStudents.every((s) => prev.has(s.id));
      if (allSelected) return new Set();
      return new Set(visibleStudents.map((s) => s.id));
    });
  };

  const applyShift = () => {
    if (selected.size === 0) {
      toast.error("Select at least one student");
      return;
    }
    const formData = new FormData();
    selected.forEach((id) => formData.append("studentIds", id));
    formData.set("shiftId", bulkShiftId);
    startTransition(async () => {
      const result = await bulkAssignStudentShiftAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`Shift updated for ${selected.size} student(s)`);
    });
  };

  const applyPlacement = () => {
    if (selected.size === 0) {
      toast.error("Select at least one student");
      return;
    }
    if (!bulkGroupId) {
      toast.error("Select a group");
      return;
    }
    const formData = new FormData();
    selected.forEach((id) => formData.append("studentIds", id));
    formData.set("groupId", bulkGroupId);
    formData.set("sectionId", bulkSectionId);
    startTransition(async () => {
      const result = await bulkAssignStudentPlacementAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`Group/Section updated for ${selected.size} student(s)`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Assign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Shift</Label>
              <Select value={bulkShiftId || "none"} onValueChange={(v) => setBulkShiftId(v === "none" ? "" : v)} disabled={isPending}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyShift} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Shift to {selected.size || ""} Selected
            </Button>
          </div>

          {groups.length > 0 && (
            <div className="flex flex-wrap items-end gap-4 border-t pt-4">
              <div>
                <Label>Group</Label>
                <Select
                  value={bulkGroupId || "none"}
                  onValueChange={(v) => {
                    setBulkGroupId(v === "none" ? "" : v);
                    setBulkSectionId("");
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {bulkGroupId && (
                <div>
                  <Label>Section</Label>
                  <Select value={bulkSectionId || "none"} onValueChange={(v) => setBulkSectionId(v === "none" ? "" : v)} disabled={isPending}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {sectionsForBulkGroup.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={applyPlacement} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Group/Section to {selected.size || ""} Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by student name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={unassignedOnly} onCheckedChange={(v) => setUnassignedOnly(v === true)} />
              Unassigned only
            </label>
          </div>

          {visibleStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No students match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={visibleStudents.length > 0 && visibleStudents.every((s) => selected.has(s.id))}
                        onCheckedChange={toggleAllVisible}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Shift</TableHead>
                    {groups.length > 0 && <TableHead>Group / Section</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-gray-500">@{s.username}</p>
                      </TableCell>
                      <TableCell>{s.batch ?? "—"}</TableCell>
                      <TableCell>
                        {s.shiftId ? (
                          <Badge variant="secondary">{shiftName.get(s.shiftId) ?? "—"}</Badge>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      {groups.length > 0 && (
                        <TableCell>
                          {s.groupId ? (
                            <span className="text-sm">
                              {groupName.get(s.groupId) ?? "—"}
                              {s.sectionId ? ` — ${sectionName.get(s.sectionId) ?? "—"}` : ""}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
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
