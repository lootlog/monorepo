/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters -- test fixtures assemble raw document JSON. */
import type { QueryClient } from "@tanstack/react-query";
import { SETTINGS_CATALOG } from "@lootlog/domain/settings-documents";
import { cloneValue, setPath } from "@lootlog/domain/settings-paths";
import { SETTINGS_DOMAINS } from "@lootlog/schema/settings-documents";
import type {
  SettingsDocumentsResponseDtoOutput,
  SoundSettingsResponseDto,
  UserGameAccountPreferencesResponseDtoOutput,
  UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { getCurrentSettingsDocumentsQueryKey } from "@/features/settings/persistence/settings-patch-client";
import {
  getSettingsDocumentsQueryKey,
  type SettingsDocumentsContext,
} from "@/features/settings/persistence/settings-documents";

type SettingsScope = {
  type: "USER" | "GAME_ACCOUNT" | "CHARACTER" | "GUILD";
  id: string;
};

/** Dotted `domain.field.path` keys mapped to stored values. */
export type SettingsDocumentValues = Record<string, unknown>;

const USER_SCOPE: SettingsScope = { type: "USER", id: "user" };

/**
 * Builds a resolved documents response: catalog defaults for every domain,
 * with the given values marked as stored on `scope`.
 */
export const createSettingsDocuments = (
  values: SettingsDocumentValues = {},
  scope: SettingsScope = USER_SCOPE,
): SettingsDocumentsResponseDtoOutput => {
  const domains: SettingsDocumentsResponseDtoOutput["domains"] = {};

  for (const domain of SETTINGS_DOMAINS) {
    const effective: Record<string, unknown> = {};
    const sources: Record<string, "DEFAULT" | SettingsScope> = {};

    for (const [field, definition] of Object.entries(
      SETTINGS_CATALOG[domain].fields,
    )) {
      setPath(effective, field, cloneValue(definition.defaultValue));
      sources[field] = "DEFAULT";
    }

    domains[domain] = {
      effective,
      layers: [],
      sources,
      schemaVersion: SETTINGS_CATALOG[domain].schemaVersion,
    };
  }

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const separatorIndex = key.indexOf(".");
    const domain = key.slice(0, separatorIndex);
    const field = key.slice(separatorIndex + 1);
    const resolution = domains[domain];

    if (!resolution) throw new Error(`Unknown settings domain in ${key}`);
    setPath(resolution.effective, field, cloneValue(value));

    const catalogField = Object.keys(resolution.sources).find(
      (candidate) => field === candidate || field.startsWith(`${candidate}.`),
    );

    resolution.sources[catalogField ?? field] = scope;
  }

  return { domains };
};

export const accountPreferenceValues = (
  preferences: Partial<UserGameAccountPreferencesResponseDtoOutput>,
) => ({
  "gameData.detector":
    preferences.hasStoredDetector === false ? undefined : preferences.detector,
  "notifications.presentation":
    preferences.hasStoredNotifications === false
      ? undefined
      : preferences.notifications,
  "gameData.pings":
    preferences.hasStoredPings === false ? undefined : preferences.pings,
  "gameData.airTags":
    preferences.hasStoredAirTags === false ? undefined : preferences.airTags,
});

type SoundSettingValuesInput = {
  notificationsVolume?: number;
  detectorVolume?: number;
  timersVolume?: number;
  pingsVolume?: number;
  notificationsConfig?: SoundSettingsResponseDto["notificationsConfig"];
  detectorConfig?: SoundSettingsResponseDto["detectorConfig"];
  timersConfig?: SoundSettingsResponseDto["timersConfig"];
};

export const soundSettingValues = (settings: SoundSettingValuesInput) => ({
  "sounds.notificationsVolume": settings.notificationsVolume,
  "sounds.detectorVolume": settings.detectorVolume,
  "sounds.timersVolume": settings.timersVolume,
  "sounds.pingsVolume": settings.pingsVolume,
  "sounds.notificationsConfig": settings.notificationsConfig ?? undefined,
  "sounds.detectorConfig": settings.detectorConfig ?? undefined,
  "sounds.timersConfig": settings.timersConfig ?? undefined,
});

export const userPreferenceValues = (
  preferences: Partial<UserPreferencesResponseDtoOutput>,
) => ({
  "notifications.mutes": preferences.mutes,
  ...Object.fromEntries(
    Object.entries(preferences.chatAppearance ?? {}).map(([key, value]) => [
      `appearance.chat.${key}`,
      value,
    ]),
  ),
});

/** Applies stored values on top of an existing (or fresh) documents response. */
export const applySettingsDocumentValues = (
  documents: SettingsDocumentsResponseDtoOutput | undefined,
  values: SettingsDocumentValues,
  scope: SettingsScope = USER_SCOPE,
): SettingsDocumentsResponseDtoOutput => {
  const patch = createSettingsDocuments(values, scope);
  const base = documents ?? createSettingsDocuments();
  const domains = { ...base.domains };

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const domain = key.slice(0, key.indexOf("."));
    const current = domains[domain];
    const incoming = patch.domains[domain];

    if (!current || !incoming) continue;
    const effective = cloneValue(current.effective);
    const field = key.slice(key.indexOf(".") + 1);
    setPath(effective, field, cloneValue(value));

    const storedField = Object.keys(incoming.sources).find(
      (candidate) =>
        incoming.sources[candidate] !== "DEFAULT" &&
        (field === candidate || field.startsWith(`${candidate}.`)),
    );

    domains[domain] = {
      ...current,
      effective,
      sources: storedField
        ? { ...current.sources, [storedField]: scope }
        : current.sources,
    };
  }

  return { domains };
};

/** Seeds values into the documents the current character context resolves to. */
export const seedSettingsDocumentValues = (
  queryClient: QueryClient,
  values: SettingsDocumentValues,
  scope: SettingsScope = USER_SCOPE,
) =>
  seedSettingsDocuments(
    queryClient,
    applySettingsDocumentValues(
      readSeededSettingsDocuments(queryClient),
      values,
      scope,
    ),
  );

/**
 * Seeds the documents the current character context resolves to, or the
 * documents of an explicit context when the character joins later.
 */
export const seedSettingsDocuments = (
  queryClient: QueryClient,
  documents: SettingsDocumentsResponseDtoOutput,
  context?: SettingsDocumentsContext,
) => {
  queryClient.setQueryData(
    context
      ? getSettingsDocumentsQueryKey(context)
      : getCurrentSettingsDocumentsQueryKey(),
    documents,
  );

  return documents;
};

export const readSeededSettingsDocuments = (queryClient: QueryClient) =>
  queryClient.getQueryData<SettingsDocumentsResponseDtoOutput>(
    getCurrentSettingsDocumentsQueryKey(),
  );
