import type { UserRole } from "@/lib/permissions/roles";

/**
 * Centralized resource → allowed-roles map. This is the single place a
 * "can this role touch this feature" question gets answered — dashboards
 * and server actions import `canAccess()` instead of scattering
 * `if (user.role === "admin" || user.role === "department")` checks
 * throughout components, which is what the legacy app did.
 *
 * This is a UX/navigation-visibility layer, NOT the security boundary.
 * The actual boundary is Row Level Security + the SECURITY DEFINER
 * functions in supabase/migrations — every one of them re-checks the
 * caller's role independently of whatever this map says. Treat a mismatch
 * between this map and the RLS policies as a bug in this map, not a way to
 * bypass the database.
 */
export const RESOURCE_ROLES = {
  admissions: ["admin", "department", "faculty", "administration"],
  promotions: ["admin", "department", "faculty", "administration"],
  fyp: ["admin", "department", "faculty", "student", "coordinator"],
  timetable: ["admin", "department", "coordinator", "faculty", "student"],
  results: ["admin", "faculty", "controller", "student", "department"],
  courseMaterials: ["admin", "faculty", "student"],
  assignments: ["admin", "faculty", "student"],
  announcements: ["admin", "principal", "department", "faculty"],
  examSchedules: ["admin", "controller", "department"],
  transcripts: ["admin", "controller", "student"],
  resultQueries: ["admin", "controller", "student"],
  academicCalendar: ["admin", "coordinator"],
  library: ["admin", "administration"],
  supportTickets: ["admin", "administration"],
  campusEvents: ["admin", "administration"],
  scholarships: ["admin", "administration"],
  feeStructures: ["admin", "principal"],
  feeManagement: ["admin", "administration"],
  departmentFees: ["admin", "department"],
  bankAccounts: ["admin", "principal", "administration"],
  shifts: ["admin", "principal"],
  courseFileReports: ["admin", "faculty", "department"],
  roleManagement: ["admin"],
  userManagement: ["admin"],
  auditLog: ["admin"],
  siteContent: ["admin"],
  // Coordinator is the primary owner per spec; admin/principal/college_admin
  // get full management access too. Appointment-order issuance specifically
  // is further restricted to principal/college_admin/admin at the RPC layer
  // (supabase/migrations/0038_recruitment_functions.sql) — coordinator can
  // see that step but not perform it.
  recruitment: ["admin", "principal", "college_admin", "coordinator"],
} as const satisfies Record<string, UserRole[]>;

export type Resource = keyof typeof RESOURCE_ROLES;

export function canAccess(role: UserRole, resource: Resource): boolean {
  return (RESOURCE_ROLES[resource] as readonly UserRole[]).includes(role);
}

/**
 * Filters a dashboard's nav items down to what the given resource set
 * allows. Items with no `resource` tag (dashboards, org-hierarchy pages,
 * anything with no entry in RESOURCE_ROLES) always pass through untouched —
 * only tagged items are actually gated. `accessible` should come from
 * `getAccessibleResources()` (role-permissions.ts), which already folds in
 * any admin override from the `role_permissions` table.
 */
export function filterNavByAccess<T extends { resource?: Resource }>(
  items: T[],
  accessible: ReadonlySet<Resource>,
): T[] {
  return items.filter((item) => !item.resource || accessible.has(item.resource));
}
