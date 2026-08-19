import { z } from "zod";

export const registerCoursesSchema = z.object({
  promotionId: z.string().uuid(),
  courseIds: z.array(z.string().uuid()).min(1, "Select at least one course"),
});
