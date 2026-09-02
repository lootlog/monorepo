import { Schema } from "effect";

export const UserLootlogConfigResponse = Schema.Struct({
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  catchingGuildIds: Schema.Array(Schema.String),
});
export type UserLootlogConfigResponse = typeof UserLootlogConfigResponse.Type;

const UserLootlogCatchingGuild = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const UserLootlogPlayerCatchingGuildsResponse = Schema.Struct({
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  guilds: Schema.Array(UserLootlogCatchingGuild),
});

export const UserLootlogPlayersCatchingGuildsRequest = Schema.Struct({
  players: Schema.Array(
    Schema.Struct({
      userId: Schema.String,
      accountId: Schema.String,
      characterId: Schema.String,
    }),
  ).check(Schema.isMaxLength(100)),
});
export type UserLootlogPlayersCatchingGuildsRequest =
  typeof UserLootlogPlayersCatchingGuildsRequest.Type;

export const UserLootlogPlayersCatchingGuildsResponse = Schema.Struct({
  players: Schema.Array(UserLootlogPlayerCatchingGuildsResponse),
});
export type UserLootlogPlayersCatchingGuildsResponse =
  typeof UserLootlogPlayersCatchingGuildsResponse.Type;

export function toUserLootlogConfigResponse(
  config: UserLootlogConfigResponse,
): UserLootlogConfigResponse {
  return config;
}
