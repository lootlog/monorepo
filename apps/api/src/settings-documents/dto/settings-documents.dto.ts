import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const SettingsDomainSchema = z.enum([
  "general",
  "appearance",
  "timers",
  "gameData",
  "notifications",
  "sounds",
  "controls",
]);

const SettingsScopeSchema = z
  .object({
    type: z.enum(["USER", "GAME_ACCOUNT", "CHARACTER", "GUILD"]),
    id: z.string().min(1),
  })
  .strict()
  .readonly();

const SettingsPatchOperationSchema = z
  .object({
    domain: SettingsDomainSchema,
    scope: SettingsScopeSchema,
    set: z.record(z.string(), z.unknown()).default({}),
    unset: z.array(z.string().min(1)).default([]),
  })
  .strict();

export class GetSettingsDocumentsQueryDto extends createSchemaClass(
  z
    .object({
      domains: z.string().min(1),
      gameAccountId: z.string().min(1).optional(),
      characterId: z.string().min(1).optional(),
      guildId: z.string().min(1).optional(),
    })
    .strict(),
) {}

export class PatchSettingsDocumentsDto extends createSchemaClass(
  z
    .object({
      operations: z.array(SettingsPatchOperationSchema).min(1),
    })
    .strict(),
) {}

const SettingsValueSourceSchema = z.union([
  z.literal("DEFAULT"),
  SettingsScopeSchema,
]);

const SettingsDocumentLayerSchema = z
  .object({
    scope: SettingsScopeSchema,
    overrides: z.record(z.string(), z.unknown()),
    schemaVersion: z.number().int().min(1).optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .readonly();

const SettingsDomainResolutionSchema = z
  .object({
    effective: z.record(z.string(), z.unknown()),
    layers: z.array(SettingsDocumentLayerSchema).readonly(),
    sources: z.record(z.string(), SettingsValueSourceSchema),
    schemaVersion: z.number().int().min(1),
    updatedAt: z.string().datetime().optional(),
  })
  .readonly();

export class SettingsDocumentsResponseDto extends createSchemaClass(
  z.object({
    domains: z.record(z.string(), SettingsDomainResolutionSchema),
  }),
) {}
