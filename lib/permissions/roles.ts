/**
 * Single source of truth for the role vocabulary. The legacy frontend had a
 * second, drifted vocabulary ("hod", "accountant") layered on top of this
 * one purely for UI labeling — `ROLE_LABELS` below is where that
 * presentation concern belongs now; it must never become a second code
 * path for authorization decisions.
 */
export const USER_ROLES = [
  "admin",
  "faculty",
  "student",
  "department",
  "controller",
  "coordinator",
  "principal",
  "administration",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  faculty: "Faculty",
  student: "Student",
  department: "Head of Department",
  controller: "Controller of Examinations",
  coordinator: "Coordinator",
  principal: "Principal",
  administration: "Administration",
};

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  faculty: "/dashboard/faculty",
  student: "/dashboard/student",
  department: "/dashboard/department",
  controller: "/dashboard/controller",
  coordinator: "/dashboard/coordinator",
  principal: "/dashboard/principal",
  administration: "/dashboard/administration",
};

/** Roles that may only be created by an admin through server-side provisioning — never via public self-registration. */
export const STAFF_ROLES = USER_ROLES.filter(
  (r): r is Exclude<UserRole, "student"> => r !== "student",
);

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
