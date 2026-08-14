import { z } from "zod";
import { STAFF_ROLES, type UserRole } from "@/lib/permissions/roles";

type StaffRole = Exclude<UserRole, "student">;
const STAFF_ROLE_TUPLE = STAFF_ROLES as unknown as [StaffRole, ...StaffRole[]];

export const provisionStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a full name").max(200),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  role: z.enum(STAFF_ROLE_TUPLE, { message: "Select a role" }),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type ProvisionStaffInput = z.infer<typeof provisionStaffSchema>;
