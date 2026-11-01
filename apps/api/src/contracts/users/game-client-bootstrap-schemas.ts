import { Schema } from "effect";
import {
  GuildSettingsDocumentsResponseSchema,
  SettingsDocumentsResponseSchema,
} from "@lootlog/schema/settings-documents";
import { AccountLootlogConfigResponse } from "#src/contracts/user-lootlog-config/schemas";
import {
  CharacterAurasResponse,
  OwnCharacterAuraResponse,
} from "#src/contracts/character-auras/schemas";
import {
  CurrentOrganizationsResponse,
  UserPreferencesResponse,
} from "#src/contracts/users/schemas";

/** The game account and character the game client starts on. */
export const GameClientBootstrapQuery = Schema.Struct({
  gameAccountId: Schema.NonEmptyString,
  characterId: Schema.optionalKey(Schema.NonEmptyString),
});

export type GameClientBootstrapQuery = typeof GameClientBootstrapQuery.Type;

/**
 * Each part is the response of the endpoint it replaces, or null when that
 * read failed. A null part is unavailable, not empty: the client reads it from
 * its own endpoint, with that endpoint's errors and retries. Parts are inline,
 * since OpenAPI 3.0 ignores `nullable` beside a `$ref`.
 */
export const GameClientBootstrapResponse = Schema.Struct({
  /** GET /users/@me/guilds/accessible */
  accessibleGuilds: Schema.NullOr(CurrentOrganizationsResponse),
  /** GET /users/@me/preferences */
  userPreferences: Schema.NullOr(Schema.Struct(UserPreferencesResponse.fields)),
  /** GET /users/@me/lootlog-config/accounts/{gameAccountId} */
  lootlogConfig: Schema.NullOr(
    Schema.Record(
      AccountLootlogConfigResponse.key,
      AccountLootlogConfigResponse.value,
    ),
  ),
  /** GET /preferences with every settings domain, in the query's context */
  settingsDocuments: Schema.NullOr(
    Schema.Struct(SettingsDocumentsResponseSchema.fields),
  ),
  /** GET /preferences/guilds for the timers domain of every accessible guild */
  guildTimerDocuments: Schema.NullOr(
    Schema.Struct(GuildSettingsDocumentsResponseSchema.fields),
  ),
  /** GET /users/@me/character-aura */
  characterAura: Schema.NullOr(Schema.Struct(OwnCharacterAuraResponse.fields)),
  /** GET /character-auras */
  characterAuras: Schema.NullOr(Schema.Struct(CharacterAurasResponse.fields)),
}).annotate({ identifier: "GameClientBootstrapResponseDto_Output" });

export type GameClientBootstrapResponse =
  typeof GameClientBootstrapResponse.Type;
