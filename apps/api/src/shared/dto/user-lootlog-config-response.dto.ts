import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const UserLootlogConfigResponseSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  catchingGuildIds: z.array(z.string()),
});

const UserLootlogCatchingGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const UserLootlogPlayerCatchingGuildsResponseSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
  characterId: z.string(),
  guilds: z.array(UserLootlogCatchingGuildSchema),
});

const UserLootlogPlayerCatchingGuildsRequestPlayerSchema = z.object({
  userId: z.string(),
  accountId: z.string(),
  characterId: z.string(),
});

const UserLootlogPlayersCatchingGuildsRequestSchema = z.object({
  players: z.array(UserLootlogPlayerCatchingGuildsRequestPlayerSchema).max(100),
});

const UserLootlogPlayersCatchingGuildsResponseSchema = z.object({
  players: z.array(UserLootlogPlayerCatchingGuildsResponseSchema),
});

export type UserLootlogConfigResponse = z.infer<
  typeof UserLootlogConfigResponseSchema
>;

export type UserLootlogPlayersCatchingGuildsRequest = z.infer<
  typeof UserLootlogPlayersCatchingGuildsRequestSchema
>;

export type UserLootlogPlayersCatchingGuildsResponse = z.infer<
  typeof UserLootlogPlayersCatchingGuildsResponseSchema
>;

type UserLootlogConfigSource = Pick<
  UserLootlogConfigResponse,
  "userId" | "accountId" | "characterId" | "catchingGuildIds"
>;

export function toUserLootlogConfigResponse(
  config: UserLootlogConfigSource,
): UserLootlogConfigResponse {
  return config;
}

export class UserLootlogConfigResponseDto extends createSchemaClass(
  UserLootlogConfigResponseSchema,
) {}

export class UserLootlogConfigAccountResponseDto extends createSchemaClass(
  z.record(z.string(), UserLootlogConfigResponseSchema),
) {}

export class UserLootlogPlayersCatchingGuildsRequestDto extends createSchemaClass(
  UserLootlogPlayersCatchingGuildsRequestSchema,
) {}

export class UserLootlogPlayersCatchingGuildsResponseDto extends createSchemaClass(
  UserLootlogPlayersCatchingGuildsResponseSchema,
) {}
