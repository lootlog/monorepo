/** Shared input and output schemas for the user-lootlog-config feature. */
import * as Schema from "effect/Schema";
import { NonEmptyString } from "#src/contracts/scalars";

const characterLootlogConfigFields = {
  userId: Schema.String,
  accountId: Schema.String,
  characterId: Schema.String,
  catchingGuildIds: Schema.Array(Schema.String),
};

export type AccountLootlogConfigResponse =
  typeof AccountLootlogConfigResponse.Type;

export const AccountLootlogConfigResponse = Schema.Record(
  Schema.String,
  Schema.Struct(characterLootlogConfigFields),
).annotate({ identifier: "UserLootlogConfigAccountResponseDto_Output" });

export type UpdateCharacterLootlogConfigRequest =
  typeof UpdateCharacterLootlogConfigRequest.Type;

export const UpdateCharacterLootlogConfigRequest = Schema.Struct({
  characterId: NonEmptyString,
  catchingGuildIds: Schema.Array(Schema.String).annotate({
    description: "Guild IDs used for catching-related actions",
  }),
}).annotate({ identifier: "CreateOrUpdateLootlogCharacterConfigDto" });

export type CharacterLootlogConfigResponse =
  typeof CharacterLootlogConfigResponse.Type;

export const CharacterLootlogConfigResponse = Schema.Struct(
  characterLootlogConfigFields,
).annotate({ identifier: "UserLootlogConfigResponseDto_Output" });

export type PlayersCatchingOrganizationsRequest =
  typeof PlayersCatchingOrganizationsRequest.Type;

export const PlayersCatchingOrganizationsRequest = Schema.Struct({
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

export type PlayersCatchingOrganizationsResponse =
  typeof PlayersCatchingOrganizationsResponse.Type;

export const PlayersCatchingOrganizationsResponse = Schema.Struct({
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
}).annotate({
  identifier: "UserLootlogPlayersCatchingGuildsResponseDto_Output",
});

export type LootlogAccountPath = typeof LootlogAccountPath.Type;

export const LootlogAccountPath = Schema.Struct({
  accountId: Schema.String.annotate({ examples: ["account_123"] }),
});
