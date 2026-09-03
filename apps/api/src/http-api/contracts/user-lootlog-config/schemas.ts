/** Transport schemas owned by the user-lootlog-config HTTP module. */
import * as Schema from "effect/Schema";

export type UserLootlogConfigAccountResponseDto_Output = {
  readonly [x: string]: {
    readonly userId: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly catchingGuildIds: ReadonlyArray<string>;
  };
};

export const UserLootlogConfigAccountResponseDto_Output = Schema.Record(
  Schema.String,
  Schema.Struct({
    userId: Schema.String,
    accountId: Schema.String,
    characterId: Schema.String,
    catchingGuildIds: Schema.Array(Schema.String),
  }),
).annotate({ identifier: "UserLootlogConfigAccountResponseDto_Output" });

export type CreateOrUpdateLootlogCharacterConfigDto = {
  readonly characterId: string;
  readonly catchingGuildIds: ReadonlyArray<string>;
};

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

export type UserLootlogConfigResponseDto_Output = {
  readonly userId: string;
  readonly accountId: string;
  readonly characterId: string;
  readonly catchingGuildIds: ReadonlyArray<string>;
};

export const UserLootlogConfigResponseDto_Output = Schema.Struct({
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  catchingGuildIds: Schema.Array(Schema.String),
}).annotate({ identifier: "UserLootlogConfigResponseDto_Output" });

export type UserLootlogPlayersCatchingGuildsRequestDto = {
  readonly players: ReadonlyArray<{
    readonly userId: string;
    readonly accountId: string;
    readonly characterId: string;
  }>;
};

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

export type UserLootlogPlayersCatchingGuildsResponseDto_Output = {
  readonly players: ReadonlyArray<{
    readonly userId: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly guilds: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
    }>;
  }>;
};

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
  { readonly accountId: string };

export const UserLootlogConfigControllerGetUserLootlogConfigByAccountIdPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["account_123"] }),
  });

export type UserLootlogConfigControllerGetUserLootlogConfigByAccountId200 =
  UserLootlogConfigAccountResponseDto_Output;

export const UserLootlogConfigControllerGetUserLootlogConfigByAccountId200 =
  UserLootlogConfigAccountResponseDto_Output;

export type UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams =
  { readonly accountId: string };

export const UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["account_123"] }),
  });

export type UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson =
  CreateOrUpdateLootlogCharacterConfigDto;

export const UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfigRequestJson =
  CreateOrUpdateLootlogCharacterConfigDto;

export type UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200 =
  UserLootlogConfigResponseDto_Output;

export const UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200 =
  UserLootlogConfigResponseDto_Output;

export type UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson =
  UserLootlogPlayersCatchingGuildsRequestDto;

export const UserLootlogConfigControllerGetPlayersCatchingGuildsRequestJson =
  UserLootlogPlayersCatchingGuildsRequestDto;

export type UserLootlogConfigControllerGetPlayersCatchingGuilds200 =
  UserLootlogPlayersCatchingGuildsResponseDto_Output;

export const UserLootlogConfigControllerGetPlayersCatchingGuilds200 =
  UserLootlogPlayersCatchingGuildsResponseDto_Output;
