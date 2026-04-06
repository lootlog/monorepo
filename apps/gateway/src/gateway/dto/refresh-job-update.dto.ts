import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RefreshJobUpdateSchema = z.object({
  jobId: z.number(),
  guildId: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  totalMembers: z.number(),
  processedMembers: z.number(),
  failedMembers: z.number(),
  completedAt: z.coerce.date().optional(),
});

export class RefreshJobUpdateDto extends createZodDto(RefreshJobUpdateSchema) {}
