import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const RefreshStatsCardResponseSchema = z.object({
  nextRefreshAt: z.string(),
});

export class RefreshStatsCardResponseDto extends createSchemaClass(
  RefreshStatsCardResponseSchema,
) {}
