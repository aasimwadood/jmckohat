import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getRolePermissions } from "@/lib/permissions/role-permissions";
import { USER_ROLES, ROLE_LABELS } from "@/lib/permissions/roles";
import { RESOURCE_ROLES } from "@/lib/permissions/policies";
import { RolePermissionsGrid } from "./role-permissions-grid";

export default async function AdminRolesPage() {
  await requireRole("admin");
  const permissions = await getRolePermissions();

  const resources = Object.keys(RESOURCE_ROLES);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
      </CardHeader>
      <CardContent>
        <RolePermissionsGrid
          roles={USER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          resources={resources}
          permissions={permissions}
        />
      </CardContent>
    </Card>
  );
}
