/** Transport schemas owned by the preferences HTTP module. */
import {
  PatchSettingsDocumentsSchema,
  SettingsDocumentsQuerySchema,
  SettingsDocumentsResponseSchema,
} from "@lootlog/schema/settings-documents";

export type SettingsDocumentsResponseDto_Output =
  typeof SettingsDocumentsResponseDto_Output.Type;

export const SettingsDocumentsResponseDto_Output =
  SettingsDocumentsResponseSchema;

export type PatchSettingsDocumentsDto = typeof PatchSettingsDocumentsDto.Type;

export const PatchSettingsDocumentsDto = PatchSettingsDocumentsSchema;

export type SettingsDocumentsControllerGetPreferencesQuery =
  typeof SettingsDocumentsControllerGetPreferencesQuery.Type;

export const SettingsDocumentsControllerGetPreferencesQuery =
  SettingsDocumentsQuerySchema;

export type SettingsDocumentsControllerGetPreferences200 =
  typeof SettingsDocumentsControllerGetPreferences200.Type;

export const SettingsDocumentsControllerGetPreferences200 =
  SettingsDocumentsResponseDto_Output;

export type SettingsDocumentsControllerPatchPreferencesRequestJson =
  typeof SettingsDocumentsControllerPatchPreferencesRequestJson.Type;

export const SettingsDocumentsControllerPatchPreferencesRequestJson =
  PatchSettingsDocumentsDto;

export type SettingsDocumentsControllerPatchPreferences200 =
  typeof SettingsDocumentsControllerPatchPreferences200.Type;

export const SettingsDocumentsControllerPatchPreferences200 =
  SettingsDocumentsResponseDto_Output;
