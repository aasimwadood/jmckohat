"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateRolePermissionAction } from "@/lib/actions/role-permissions";
import type { UserRole } from "@/lib/permissions/roles";
import type { Resource } from "@/lib/permissions/policies";

type Permission = { role: UserRole; resource: Resource; canView: boolean; canEdit: boolean };

export function RolePermissionsGrid({
  roles,
  resources,
  permissions,
}: {
  roles: { value: UserRole; label: string }[];
  resources: string[];
  permissions: Permission[];
}) {
  const [state, setState] = useState(permissions);
  const [, startTransition] = useTransition();

  const find = (role: UserRole, resource: string) => state.find((p) => p.role === role && p.resource === resource);

  const toggle = (role: UserRole, resource: Resource, field: "canView" | "canEdit") => {
    const current = find(role, resource) ?? { role, resource, canView: false, canEdit: false };
    const next = { ...current, [field]: !current[field] };
    setState((prev) => [...prev.filter((p) => !(p.role === role && p.resource === resource)), next]);

    startTransition(async () => {
      const result = await updateRolePermissionAction(role, resource, next.canView, next.canEdit);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            {roles.map((r) => (
              <TableHead key={r.value} className="text-center">
                {r.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => (
            <TableRow key={resource}>
              <TableCell className="font-medium capitalize">{resource.replace(/([A-Z])/g, " $1").trim()}</TableCell>
              {roles.map((r) => {
                const perm = find(r.value, resource);
                return (
                  <TableCell key={r.value} className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <label className="flex items-center gap-1 text-xs" title="View">
                        <Checkbox
                          checked={perm?.canView ?? false}
                          onCheckedChange={() => toggle(r.value, resource as Resource, "canView")}
                        />
                        V
                      </label>
                      <label className="flex items-center gap-1 text-xs" title="Edit">
                        <Checkbox
                          checked={perm?.canEdit ?? false}
                          onCheckedChange={() => toggle(r.value, resource as Resource, "canEdit")}
                        />
                        E
                      </label>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
