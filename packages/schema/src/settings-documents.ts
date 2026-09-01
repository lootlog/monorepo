import { Schema } from "effect";

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
  id: Schema.NonEmptyString,
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

export const SettingsDocumentLayerSchema = Schema.Struct({
  scope: SettingsScopeSchema,
  overrides: Schema.Record(Schema.String, Schema.Unknown),
  schemaVersion: Schema.optionalKey(Schema.Int),
  updatedAt: Schema.optionalKey(Schema.String),
});
export type SettingsDocumentLayer = typeof SettingsDocumentLayerSchema.Type;

export const SettingsDomainResolutionSchema = Schema.Struct({
  effective: Schema.Record(Schema.String, Schema.Unknown),
  layers: Schema.Array(SettingsDocumentLayerSchema),
  sources: Schema.Record(Schema.String, SettingsValueSourceSchema),
  schemaVersion: Schema.Int,
  updatedAt: Schema.optionalKey(Schema.String),
});
export type SettingsDomainResolution =
  typeof SettingsDomainResolutionSchema.Type;
