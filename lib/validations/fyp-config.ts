import { z } from "zod";

export const setFypConfigSchema = z.object({
  semesterId: z.string().uuid(),
  isEnabled: z.boolean(),
  maxMembers: z.coerce.number().int().min(1).max(10),
  supervisorQuota: z.coerce.number().int().min(1).max(50),
  proposalDeadline: z.string().optional().or(z.literal("")),
  midSemesterDeadline: z.string().optional().or(z.literal("")),
  finalDeadline: z.string().optional().or(z.literal("")),
});
export type SetFypConfigInput = z.infer<typeof setFypConfigSchema>;
