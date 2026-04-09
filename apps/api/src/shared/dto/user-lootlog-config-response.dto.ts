import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const UserLootlogConfigResponseSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  collectLootWhitelistGuildIds: z.array(z.string()),
  addTimersWhitelistGuildIds: z.array(z.string()),
});

export class UserLootlogConfigResponseDto extends createZodDto(
  UserLootlogConfigResponseSchema,
) {}

export class UserLootlogConfigAccountResponseDto extends createZodDto(
  z.record(z.string(), UserLootlogConfigResponseSchema),
) {}
