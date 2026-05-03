import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const RefreshStatsCardResponseSchema = z.object({
  nextRefreshAt: z.string(),
});

export class RefreshStatsCardResponseDto extends createZodDto(
  RefreshStatsCardResponseSchema,
) {}
