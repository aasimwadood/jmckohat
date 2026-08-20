import { z } from "zod";

export const upsertGroupSchema = z.object({
  id: z.string().uuid().optional(),
  departmentId: z.string().uuid(),
  name: z.string().trim().min(1, "Group name is required").max(60),
  code: z
    .string()
    .trim()
    .min(1, "Group code is required")
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "Code must be lowercase letters, numbers, - or _ only"),
});

export const deleteGroupSchema = z.object({
  id: z.string().uuid(),
});

export const upsertSectionSchema = z.object({
  id: z.string().uuid().optional(),
  departmentId: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().trim().min(1, "Section name is required").max(60),
  code: z
    .string()
    .trim()
    .min(1, "Section code is required")
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "Code must be lowercase letters, numbers, - or _ only"),
});

export const deleteSectionSchema = z.object({
  id: z.string().uuid(),
});
