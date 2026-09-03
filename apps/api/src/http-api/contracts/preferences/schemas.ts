/** Transport schemas owned by the preferences HTTP module. */
import {
  PatchSettingsDocumentsSchema,
  SettingsDocumentsQuerySchema,
  SettingsDocumentsResponseSchema,
} from "@lootlog/schema/settings-documents";

export type SettingsDocumentsResponseDto_Output =
  typeof SettingsDocumentsResponseSchema.Type;

export const SettingsDocumentsResponseDto_Output =
  SettingsDocumentsResponseSchema;

export type PatchSettingsDocumentsDto =
  typeof PatchSettingsDocumentsSchema.Type;

export const PatchSettingsDocumentsDto = PatchSettingsDocumentsSchema;

export type SettingsDocumentsControllerGetPreferencesQuery =
  typeof SettingsDocumentsQuerySchema.Type;

export const SettingsDocumentsControllerGetPreferencesQuery =
  SettingsDocumentsQuerySchema;

export type SettingsDocumentsControllerGetPreferences200 =
  SettingsDocumentsResponseDto_Output;

export const SettingsDocumentsControllerGetPreferences200 =
  SettingsDocumentsResponseDto_Output;

export type SettingsDocumentsControllerPatchPreferencesRequestJson =
  PatchSettingsDocumentsDto;

export const SettingsDocumentsControllerPatchPreferencesRequestJson =
  PatchSettingsDocumentsDto;

export type SettingsDocumentsControllerPatchPreferences200 =
  SettingsDocumentsResponseDto_Output;

export const SettingsDocumentsControllerPatchPreferences200 =
  SettingsDocumentsResponseDto_Output;
