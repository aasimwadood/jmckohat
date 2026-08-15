import { z } from "zod";

export const createDirectorateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(200),
  code: z.string().trim().min(2, "Enter a code").max(30),
});

export const createJmcSchema = z.object({
  directorateId: z.string().uuid(),
  name: z.string().trim().min(2, "Enter a name").max(200),
  code: z.string().trim().min(2, "Enter a code").max(30),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  division: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  contactNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

export const createCollegeSchema = z.object({
  jmcId: z.string().uuid(),
  collegeTypeId: z.string().uuid(),
  name: z.string().trim().min(2, "Enter a name").max(200),
  code: z.string().trim().min(2, "Enter a code").max(30),
  // Multi-college public site (0042): the public URL slug — required at
  // creation, since a college with no slug can never resolve a
  // /college/[slug] page at all (see lib/services/colleges.ts).
  slug: z
    .string()
    .trim()
    .min(2, "Enter a URL slug")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  division: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  contactNumber: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

export const toggleOrgStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const ORG_ADMIN_ROLES = ["directorate_admin", "jmc_admin", "college_admin"] as const;

export const provisionOrgAdminSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a full name").max(200),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  role: z.enum(ORG_ADMIN_ROLES, { message: "Select a role" }),
  orgId: z.string().uuid("Select the organization this admin belongs to"),
});
export type ProvisionOrgAdminInput = z.infer<typeof provisionOrgAdminSchema>;
