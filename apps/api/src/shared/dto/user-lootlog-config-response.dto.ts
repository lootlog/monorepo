import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const UserLootlogConfigResponseSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  catchingGuildIds: z.array(z.string()),
  collectLootWhitelistGuildIds: z
    .array(z.string())
    .describe("DEPRECATED: Use catchingGuildIds instead"),
  addTimersWhitelistGuildIds: z
    .array(z.string())
    .describe("DEPRECATED: Use catchingGuildIds instead"),
});

export type UserLootlogConfigResponse = z.infer<
  typeof UserLootlogConfigResponseSchema
>;

type UserLootlogConfigSource = Pick<
  UserLootlogConfigResponse,
  "userId" | "accountId" | "characterId" | "catchingGuildIds"
>;

export function toUserLootlogConfigResponse(
  config: UserLootlogConfigSource,
): UserLootlogConfigResponse {
  return {
    ...config,
    collectLootWhitelistGuildIds: config.catchingGuildIds,
    addTimersWhitelistGuildIds: config.catchingGuildIds,
  };
}

export class UserLootlogConfigResponseDto extends createZodDto(
  UserLootlogConfigResponseSchema,
) {}

export class UserLootlogConfigAccountResponseDto extends createZodDto(
  z.record(z.string(), UserLootlogConfigResponseSchema),
) {}
