import { z } from "zod";

export const createDesignationTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  scope: z.enum(["college", "department"]),
});
export type CreateDesignationTypeInput = z.infer<typeof createDesignationTypeSchema>;

export const setDesignationAssignmentSchema = z.object({
  designationTypeId: z.string().uuid(),
  profileId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
});
export type SetDesignationAssignmentInput = z.infer<typeof setDesignationAssignmentSchema>;

export const setHeadOfDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  profileId: z.string().uuid().nullable(),
});
export type SetHeadOfDepartmentInput = z.infer<typeof setHeadOfDepartmentSchema>;
