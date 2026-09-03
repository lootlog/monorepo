/** Transport schemas owned by the user-lootlog-config HTTP module. */
import * as Schema from "effect/Schema";

export type UserLootlogConfigAccountResponseDto_Output =
  typeof UserLootlogConfigAccountResponseDto_Output.Type;

export const UserLootlogConfigAccountResponseDto_Output = Schema.Record(
  Schema.String,
  Schema.Struct({
    userId: Schema.String,
    accountId: Schema.String,
    characterId: Schema.String,
    catchingGuildIds: Schema.Array(Schema.String),
  }),
).annotate({ identifier: "UserLootlogConfigAccountResponseDto_Output" });

export type CreateOrUpdateLootlogCharacterConfigDto =
  typeof CreateOrUpdateLootlogCharacterConfigDto.Type;

export const CreateOrUpdateLootlogCharacterConfigDto = Schema.Struct({
  characterId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  catchingGuildIds: Schema.Array(Schema.String).annotate({
    description: "Guild IDs used for catching-related actions",
  }),
}).annotate({ identifier: "CreateOrUpdateLootlogCharacterConfigDto" });

export type UserLootlogConfigResponseDto_Output =
  typeof UserLootlogConfigResponseDto_Output.Type;

export const UserLootlogConfigResponseDto_Output = Schema.Struct({
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  catchingGuildIds: Schema.Array(Schema.String),
}).annotate({ identifier: "UserLootlogConfigResponseDto_Output" });

export type UserLootlogPlayersCatchingGuildsRequestDto =
  typeof UserLootlogPlayersCatchingGuildsRequestDto.Type;

export const UserLootlogPlayersCatchingGuildsRequestDto = Schema.Struct({
  players: Schema.Array(
    Schema.Struct({
      userId: Schema.String,
      accountId: Schema.String,
      characterId: Schema.String,
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
}).annotate({ identifier: "UserLootlogPlayersCatchingGuildsRequestDto" });

export type UserLootlogPlayersCatchingGuildsResponseDto_Output =
  typeof UserLootlogPlayersCatchingGuildsResponseDto_Output.Type;

export const UserLootlogPlayersCatchingGuildsResponseDto_Output = Schema.Struct(
  {
    players: Schema.Array(
      Schema.Struct({
        userId: Schema.String,
        accountId: Schema.String,
        characterId: Schema.String,
        guilds: Schema.Array(
          Schema.Struct({ id: Schema.String, name: Schema.String }),
        ),
      }),
    ),
  },
).annotate({
  identifier: "UserLootlogPlayersCatchingGuildsResponseDto_Output",
});

export type UserLootlogConfigControllerGetUserLootlogConfigByAccountIdPathParams =
  typeof UserLootlogConfigControllerGetUserLootlogConfigByAccountIdPathParams.Type;

export const UserLootlogConfigControllerGetUserLootlogConfigByAccountIdPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["account_123"] }),
  });

export type UserLootlogConfigControllerGetUserLootlogConfigByAccountId200 =
  typeof UserLootlogConfigControllerGetUserLootlogConfigByAccountId200.Type;

export const UserLootlogConfigControllerGetUserLootlogConfigByAccountId200 =
  UserLootlogConfigAccountResponseDto_Output;

export type UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams =
  typeof UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams.Type;

export const UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["account_123"] }),
  });

export type UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson =
  typeof UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson.Type;

export const UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson =
  CreateOrUpdateLootlogCharacterConfigDto;

export type UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200 =
  typeof UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200.Type;

export const UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200 =
  UserLootlogConfigResponseDto_Output;

export type UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson =
  typeof UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson.Type;

export const UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson =
  UserLootlogPlayersCatchingGuildsRequestDto;

export type UserLootlogConfigControllerGetPlayersCatchingGuilds200 =
  typeof UserLootlogConfigControllerGetPlayersCatchingGuilds200.Type;

export const UserLootlogConfigControllerGetPlayersCatchingGuilds200 =
  UserLootlogPlayersCatchingGuildsResponseDto_Output;
