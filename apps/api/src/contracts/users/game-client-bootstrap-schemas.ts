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
import { OrganizationCapabilitiesResponse } from "#src/contracts/guilds/schemas";
import {
  CurrentOrganizationsResponse,
  UserPreferencesResponse,
} from "#src/contracts/users/schemas";

export const GameClientBootstrapQuery = Schema.Struct({
  gameAccountId: Schema.NonEmptyString,
  characterId: Schema.optionalKey(Schema.NonEmptyString),
});

export type GameClientBootstrapQuery = typeof GameClientBootstrapQuery.Type;

export const GameClientBootstrapResponse = Schema.Struct({
  accessibleGuilds: Schema.NullOr(CurrentOrganizationsResponse),
  userPreferences: Schema.NullOr(Schema.Struct(UserPreferencesResponse.fields)),
  lootlogConfig: Schema.NullOr(
    Schema.Record(
      AccountLootlogConfigResponse.key,
      AccountLootlogConfigResponse.value,
    ),
  ),
  settingsDocuments: Schema.NullOr(
    Schema.Struct(SettingsDocumentsResponseSchema.fields),
  ),
  guildTimerDocuments: Schema.NullOr(
    Schema.Struct(GuildSettingsDocumentsResponseSchema.fields),
  ),
  guildPermissions: Schema.NullOr(
    Schema.Record(Schema.String, OrganizationCapabilitiesResponse),
  ),
  characterAura: Schema.NullOr(Schema.Struct(OwnCharacterAuraResponse.fields)),
  characterAuras: Schema.NullOr(Schema.Struct(CharacterAurasResponse.fields)),
}).annotate({ identifier: "GameClientBootstrapResponseDto_Output" });

export type GameClientBootstrapResponse =
  typeof GameClientBootstrapResponse.Type;
