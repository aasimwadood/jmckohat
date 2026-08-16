import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/lib/permissions/roles";
import { USER_ROLES } from "@/lib/permissions/roles";
import { Resource, RESOURCE_ROLES } from "@/lib/permissions/policies";

export type RolePermission = {
  role: UserRole;
  resource: Resource;
  canView: boolean;
  canEdit: boolean;
};

/**
 * Backs the Admin dashboard's "Role Management" screen — a real,
 * persisted version of what was a client-only mock checkbox grid in the
 * legacy app. Seeded implicitly from RESOURCE_ROLES on first read: a role
 * granted access to a resource in the static policy map starts with
 * view+edit, everyone else starts denied, until an admin overrides a row.
 */
export async function getRolePermissions(): Promise<RolePermission[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("role_permissions").select("role, resource, can_view, can_edit");

  const overrides = new Map((data ?? []).map((row) => [`${row.role}:${row.resource}`, row]));
  const resources = Object.keys(RESOURCE_ROLES) as Resource[];

  return USER_ROLES.flatMap((role) =>
    resources.map((resource) => {
      const override = overrides.get(`${role}:${resource}`);
      if (override) {
        return { role, resource, canView: override.can_view, canEdit: override.can_edit };
      }
      const defaultAllowed = (RESOURCE_ROLES[resource] as readonly UserRole[]).includes(role);
      return { role, resource, canView: defaultAllowed, canEdit: defaultAllowed };
    }),
  );
}

/**
 * The resources a role can currently see, folding in any admin override
 * from `role_permissions` over the RESOURCE_ROLES default — this is what
 * actually makes the Role Management screen's toggles do something.
 * Scoped to one role (not all of them, unlike getRolePermissions()) since
 * that's all a single dashboard layout ever needs.
 */
export async function getAccessibleResources(role: UserRole): Promise<Set<Resource>> {
  const supabase = await createClient();
  const { data } = await supabase.from("role_permissions").select("resource, can_view").eq("role", role);

  const overrides = new Map((data ?? []).map((row) => [row.resource as Resource, row.can_view]));
  const resources = Object.keys(RESOURCE_ROLES) as Resource[];

  return new Set(
    resources.filter((resource) => {
      const override = overrides.get(resource);
      if (override !== undefined) return override;
      return (RESOURCE_ROLES[resource] as readonly UserRole[]).includes(role);
    }),
  );
}

export async function setRolePermission(
  role: UserRole,
  resource: Resource,
  canView: boolean,
  canEdit: boolean,
): Promise<{ error?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .upsert({ role, resource, can_view: canView, can_edit: canEdit }, { onConflict: "role,resource" });

  if (error) return { error: error.message };
  return {};
}
