import { Effect, Schema } from "effect";
import { IsoDateTime } from "./primitives.js";

export const SETTINGS_DOMAINS = [
  "general",
  "appearance",
  "chat",
  "timers",
  "gameData",
  "notifications",
  "sounds",
  "controls",
] as const;

const SettingsDomainSchema = Schema.Literals(SETTINGS_DOMAINS);

export type SettingsDomain = typeof SettingsDomainSchema.Type;

const SETTINGS_SCOPE_TYPES = [
  "USER",
  "GAME_ACCOUNT",
  "CHARACTER",
  "GUILD",
] as const;

const SettingsScopeTypeSchema = Schema.Literals(SETTINGS_SCOPE_TYPES);

export type SettingsScopeType = typeof SettingsScopeTypeSchema.Type;

const SettingsScopeSchema = Schema.Struct({
  type: SettingsScopeTypeSchema,
  id: Schema.NonEmptyString,
});

export type SettingsScope = typeof SettingsScopeSchema.Type;

const SettingsValueSourceSchema = Schema.Union([
  Schema.Literal("DEFAULT"),
  SettingsScopeSchema,
]);

export type SettingsValueSource = typeof SettingsValueSourceSchema.Type;

const PositiveSafeInt = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(1),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
);

const SettingsDocumentLayerSchema = Schema.Struct({
  scope: SettingsScopeSchema,
  overrides: Schema.Record(Schema.String, Schema.Unknown),
  schemaVersion: Schema.optionalKey(PositiveSafeInt),
  updatedAt: Schema.optionalKey(IsoDateTime),
});

export type SettingsDocumentLayer = typeof SettingsDocumentLayerSchema.Type;

const SettingsDomainResolutionSchema = Schema.Struct({
  effective: Schema.Record(Schema.String, Schema.Unknown),
  layers: Schema.Array(SettingsDocumentLayerSchema),
  sources: Schema.Record(Schema.String, SettingsValueSourceSchema),
  schemaVersion: PositiveSafeInt,
  updatedAt: Schema.optionalKey(IsoDateTime),
});

export type SettingsDomainResolution =
  typeof SettingsDomainResolutionSchema.Type;

export const SettingsDocumentsQuerySchema = Schema.Struct({
  domains: Schema.NonEmptyString,
  gameAccountId: Schema.optionalKey(Schema.NonEmptyString),
  characterId: Schema.optionalKey(Schema.NonEmptyString),
  guildId: Schema.optionalKey(Schema.NonEmptyString),
});

export type SettingsDocumentsQuery = typeof SettingsDocumentsQuerySchema.Type;

const SettingsPatchOperationSchema = Schema.Struct({
  domain: SettingsDomainSchema,
  scope: SettingsScopeSchema,
  set: Schema.Record(Schema.String, Schema.Json)
    .annotate({ default: {} })
    .pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed({}))),
  unset: Schema.Array(Schema.NonEmptyString)
    .annotate({ default: [] })
    .pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed([]))),
  expectedUpdatedAt: Schema.optionalKey(Schema.NullOr(IsoDateTime)),
});

const SettingsDocumentsContextSchema = Schema.Struct({
  gameAccountId: Schema.optionalKey(Schema.NonEmptyString),
  characterId: Schema.optionalKey(Schema.NonEmptyString),
  guildId: Schema.optionalKey(Schema.NonEmptyString),
}).annotate({ identifier: "SettingsDocumentsContextDto" });

export const PatchSettingsDocumentsSchema = Schema.Struct({
  operations: Schema.Array(SettingsPatchOperationSchema).check(
    Schema.isMinLength(1),
  ),
  context: Schema.optionalKey(SettingsDocumentsContextSchema),
}).annotate({ identifier: "PatchSettingsDocumentsDto" });

export const GuildSettingsDocumentsQuerySchema = Schema.Struct({
  domains: Schema.NonEmptyString,
  guildIds: Schema.NonEmptyString,
});

export type GuildSettingsDocumentsQuery =
  typeof GuildSettingsDocumentsQuerySchema.Type;

export const GUILD_SETTINGS_DOCUMENTS_MAX_GUILDS = 50;

export type PatchSettingsDocuments = typeof PatchSettingsDocumentsSchema.Type;

const SettingsDocumentLayerResponseSchema = Schema.Struct({
  scope: SettingsScopeSchema,
  overrides: Schema.Record(Schema.String, Schema.Json),
  schemaVersion: Schema.optionalKey(PositiveSafeInt),
  updatedAt: Schema.optionalKey(IsoDateTime),
});

const SettingsDomainResolutionResponseSchema = Schema.Struct({
  effective: Schema.Record(Schema.String, Schema.Json),
  layers: Schema.Array(SettingsDocumentLayerResponseSchema),
  sources: Schema.Record(Schema.String, SettingsValueSourceSchema),
  schemaVersion: PositiveSafeInt,
  updatedAt: Schema.optionalKey(IsoDateTime),
});

export const SettingsDocumentsResponseSchema = Schema.Struct({
  domains: Schema.Record(Schema.String, SettingsDomainResolutionResponseSchema),
}).annotate({ identifier: "SettingsDocumentsResponseDto_Output" });

export type SettingsDocumentsResponse =
  typeof SettingsDocumentsResponseSchema.Type;

export const GuildSettingsDocumentsResponseSchema = Schema.Struct({
  guilds: Schema.Record(Schema.String, SettingsDocumentsResponseSchema),
}).annotate({ identifier: "GuildSettingsDocumentsResponseDto_Output" });

export type GuildSettingsDocumentsResponse =
  typeof GuildSettingsDocumentsResponseSchema.Type;
