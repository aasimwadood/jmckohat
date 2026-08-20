import { z } from "zod";

export const upsertShiftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Shift name is required").max(60),
  code: z
    .string()
    .trim()
    .min(1, "Shift code is required")
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "Code must be lowercase letters, numbers, - or _ only"),
});

export const deleteShiftSchema = z.object({
  id: z.string().uuid(),
});
