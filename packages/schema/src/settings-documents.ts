import { Effect, Schema } from "effect";
import { IsoDateTime, NonEmptyString } from "./primitives.js";

export const SETTINGS_DOMAINS = [
  "general",
  "appearance",
  "timers",
  "gameData",
  "notifications",
  "sounds",
  "controls",
] as const;
export const SettingsDomainSchema = Schema.Literals(SETTINGS_DOMAINS);
export type SettingsDomain = typeof SettingsDomainSchema.Type;

export const SETTINGS_SCOPE_TYPES = [
  "USER",
  "GAME_ACCOUNT",
  "CHARACTER",
  "GUILD",
] as const;
export const SettingsScopeTypeSchema = Schema.Literals(SETTINGS_SCOPE_TYPES);
export type SettingsScopeType = typeof SettingsScopeTypeSchema.Type;

export const SettingsScopeSchema = Schema.Struct({
  type: SettingsScopeTypeSchema,
  id: NonEmptyString,
});
export type SettingsScope = typeof SettingsScopeSchema.Type;

export const SettingsValueSourceSchema = Schema.Union([
  Schema.Literal("DEFAULT"),
  SettingsScopeSchema,
]);
export type SettingsValueSource = typeof SettingsValueSourceSchema.Type;

export const SettingsPersistenceSchema = Schema.Literals([
  "SERVER_DOCUMENT",
  "DEVICE",
]);
export type SettingsPersistence = typeof SettingsPersistenceSchema.Type;

const PositiveSafeInt = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(1),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
);

export const SettingsDocumentLayerSchema = Schema.Struct({
  scope: SettingsScopeSchema,
  overrides: Schema.Record(Schema.String, Schema.Unknown),
  schemaVersion: Schema.optionalKey(PositiveSafeInt),
  updatedAt: Schema.optionalKey(IsoDateTime),
});
export type SettingsDocumentLayer = typeof SettingsDocumentLayerSchema.Type;

export const SettingsDomainResolutionSchema = Schema.Struct({
  effective: Schema.Record(Schema.String, Schema.Unknown),
  layers: Schema.Array(SettingsDocumentLayerSchema),
  sources: Schema.Record(Schema.String, SettingsValueSourceSchema),
  schemaVersion: PositiveSafeInt,
  updatedAt: Schema.optionalKey(IsoDateTime),
});
export type SettingsDomainResolution =
  typeof SettingsDomainResolutionSchema.Type;

export const SettingsDocumentsQuerySchema = Schema.Struct({
  domains: NonEmptyString,
  gameAccountId: Schema.optionalKey(NonEmptyString),
  characterId: Schema.optionalKey(NonEmptyString),
  guildId: Schema.optionalKey(NonEmptyString),
});
export type SettingsDocumentsQuery = typeof SettingsDocumentsQuerySchema.Type;

export const SettingsPatchOperationSchema = Schema.Struct({
  domain: SettingsDomainSchema,
  scope: SettingsScopeSchema,
  set: Schema.Record(Schema.String, Schema.Json)
    .annotate({ default: {} })
    .pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed({}))),
  unset: Schema.Array(NonEmptyString)
    .annotate({ default: [] })
    .pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed([]))),
});

export const PatchSettingsDocumentsSchema = Schema.Struct({
  operations: Schema.Array(SettingsPatchOperationSchema).check(
    Schema.isMinLength(1),
  ),
}).annotate({ identifier: "PatchSettingsDocumentsDto" });
export type PatchSettingsDocuments = typeof PatchSettingsDocumentsSchema.Type;
export type EncodedPatchSettingsDocuments =
  typeof PatchSettingsDocumentsSchema.Encoded;

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
export type EncodedSettingsDocumentsResponse =
  typeof SettingsDocumentsResponseSchema.Encoded;
