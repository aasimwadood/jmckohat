import { z } from "zod";
import { COLLEGE_STAFF_ROLES } from "@/lib/permissions/roles";

// Deliberately COLLEGE_STAFF_ROLES, not STAFF_ROLES — see the comment on
// COLLEGE_STAFF_ROLES in lib/permissions/roles.ts for why the 4 org-level
// roles must never be selectable from this college-admin-facing form.
type StaffRole = (typeof COLLEGE_STAFF_ROLES)[number];
const STAFF_ROLE_TUPLE = COLLEGE_STAFF_ROLES as unknown as [StaffRole, ...StaffRole[]];

export const provisionStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a full name").max(200),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  role: z.enum(STAFF_ROLE_TUPLE, { message: "Select a role" }),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type ProvisionStaffInput = z.infer<typeof provisionStaffSchema>;
