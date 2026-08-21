"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleActiveButton } from "@/app/dashboard/admin/users/toggle-active-button";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions/roles";

export type UserManagementRow = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  isActive: boolean;
};

type TypeFilter = "all" | "staff" | "student";

// User Management mixes every role (12 staff roles + student) in one flat
// list with no way to narrow it down — a real usability gap once the
// school has 1000+ student accounts alongside its handful of staff. This
// adds a Staff/Student split (the distinction that actually matters day to
// day) plus a role dropdown for staff and a name/email search, all
// client-side since the full list is already fetched server-side.
export function UserManagementView({
  users,
  departmentNames,
  canToggleActive,
}: {
  users: UserManagementRow[];
  departmentNames: Map<string, string>;
  canToggleActive: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [roleFilter, setRoleFilter] = useState("");

  const staffCount = useMemo(() => users.filter((u) => u.role !== "student").length, [users]);
  const studentCount = useMemo(() => users.filter((u) => u.role === "student").length, [users]);

  const staffRoles = useMemo(
    () => [...new Set(users.filter((u) => u.role !== "student").map((u) => u.role))].sort((a, b) => ROLE_LABELS[a].localeCompare(ROLE_LABELS[b])),
    [users],
  );

  const onTypeFilterChange = (next: TypeFilter) => {
    setTypeFilter(next);
    setRoleFilter("");
  };

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (typeFilter === "staff" && u.role === "student") return false;
      if (typeFilter === "student" && u.role !== "student") return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (q && !u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, typeFilter, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button size="sm" variant={typeFilter === "all" ? "default" : "ghost"} onClick={() => onTypeFilterChange("all")}>
            All ({users.length})
          </Button>
          <Button size="sm" variant={typeFilter === "staff" ? "default" : "ghost"} onClick={() => onTypeFilterChange("staff")}>
            Staff ({staffCount})
          </Button>
          <Button size="sm" variant={typeFilter === "student" ? "default" : "ghost"} onClick={() => onTypeFilterChange("student")}>
            Students ({studentCount})
          </Button>
        </div>
        {typeFilter === "staff" && (
          <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All staff roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff roles</SelectItem>
              {staffRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            {canToggleActive && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleUsers.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.fullName}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{ROLE_LABELS[u.role]}</TableCell>
              <TableCell>{u.departmentId ? (departmentNames.get(u.departmentId) ?? "—") : "—"}</TableCell>
              <TableCell>
                <Badge variant={u.isActive ? "default" : "destructive"}>{u.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
              {canToggleActive && (
                <TableCell>
                  <ToggleActiveButton userId={u.id} isActive={u.isActive} />
                </TableCell>
              )}
            </TableRow>
          ))}
          {visibleUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={canToggleActive ? 6 : 5} className="py-8 text-center text-gray-500">
                No users match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
