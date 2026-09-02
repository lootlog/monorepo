import { createZodDto } from "nestjs-zod";
import * as z from "zod";

const UserCurrentGuildResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  vanityUrl: z.string().nullable().optional(),
  ownerId: z.string(),
  publicStatsCardEnabled: z.boolean(),
  hasLootlogAccess: z.boolean(),
  isAccessDataStale: z.boolean(),
});

export class UserCurrentGuildResponseDto extends createZodDto(
  UserCurrentGuildResponseSchema,
) {}
