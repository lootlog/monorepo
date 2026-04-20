import { z } from "zod";

export const RefreshJobUpdateSchema = z.object({
  jobId: z.number(),
  guildId: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  totalMembers: z.number(),
  processedMembers: z.number(),
  failedMembers: z.number(),
  completedAt: z.coerce.date().optional(),
});

export type RefreshJobUpdateDto = z.infer<typeof RefreshJobUpdateSchema>;
