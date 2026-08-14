"use server";

import { revalidatePath } from "next/cache";
import { setRolePermission } from "@/lib/permissions/role-permissions";
import type { UserRole } from "@/lib/permissions/roles";
import type { Resource } from "@/lib/permissions/policies";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateRolePermissionAction(
  role: UserRole,
  resource: Resource,
  canView: boolean,
  canEdit: boolean,
): Promise<ActionResult> {
  const result = await setRolePermission(role, resource, canView, canEdit);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/admin/roles");
  return {};
}
