import { z } from "zod";

export const createFypGroupSchema = z.object({
  departmentId: z.string().uuid(),
  semesterId: z.string().uuid(),
  supervisorProfileId: z.string().uuid("Select a supervisor"),
  title: z.string().trim().max(300).optional().or(z.literal("")),
  memberIds: z.array(z.string().uuid()).max(3, "Maximum 3 additional members allowed"),
});
export type CreateFypGroupInput = z.infer<typeof createFypGroupSchema>;
