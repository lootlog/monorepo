import {
  NEVER_STORED_AT,
  type SettingsDocuments,
  type SettingsDocumentsFailure,
  type SettingsDocumentsResponse,
} from "#src/settings-documents/settings-documents.service";
import { Effect, Schema, Predicate, type Types } from "effect";
import type {
  MigrateTimerSettingsRequest,
  UpdateOrganizationTimerSettingsRequest,
  UpdateTimerSettingsRequest,
} from "#src/contracts/timer-settings/schemas";

const APPEARANCE_FIELDS = [
  "displayConfig",
  "customColors",
  "timersColors",
  "defaultColorNames",
  "overriddenDefaultColors",
  "hiddenDefaultColors",
] as const;

type JsonValue = typeof Schema.Json.Type;

type JsonObject = { [key: string]: JsonValue };

type TimerEffect = Effect.Effect<unknown, SettingsDocumentsFailure>;

export interface TimerSettings {
  readonly getGlobalSettings: (userId: string) => TimerEffect;
  readonly updateGlobalSettings: (
    userId: string,
    dto: UpdateTimerSettingsRequest,
  ) => TimerEffect;
  readonly getGuildSettings: (userId: string, guildId: string) => TimerEffect;
  readonly updateGuildSettings: (
    userId: string,
    guildId: string,
    dto: UpdateOrganizationTimerSettingsRequest,
  ) => TimerEffect;
  readonly migrateSettings: (
    userId: string,
    dto: MigrateTimerSettingsRequest,
  ) => TimerEffect;
}

const asRecord = (value: unknown) => (Predicate.isObject(value) ? value : {});

const asJsonValue = (value: unknown): JsonValue => {
  if (value === null) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) return value.map(asJsonValue);

  if (!Predicate.isObject(value)) return null;

  return asJsonObject(value);
};

const asJsonObject = (value: unknown): JsonObject => {
  if (!Predicate.isObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, asJsonValue(entry)]),
  );
};

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const mapGlobalSettingsResponse = (
  userId: string,
  response: SettingsDocumentsResponse,
) => {
  const appearance = response.domains.appearance;
  const timers = response.domains.timers;
  const timerAppearance = asRecord(appearance?.effective.timers);
  const displayConfig = asJsonObject(timerAppearance.displayConfig);
  const effectiveTimers = timers?.effective ?? {};

  const updatedAtValues = [appearance?.updatedAt, timers?.updatedAt]
    .filter((value): value is Date => value !== undefined)
    .sort((left, right) => left.getTime() - right.getTime());

  const updatedAtValue = updatedAtValues[updatedAtValues.length - 1];
  const updatedAt = updatedAtValue ?? NEVER_STORED_AT;

  const timersSortOrder: "asc" | "desc" =
    effectiveTimers.timersSortOrder === "desc" ? "desc" : "asc";

  return {
    userId,
    generalConfig: asJsonObject(effectiveTimers.generalConfig),
    displayConfig: {
      ...displayConfig,
      legacyAppearance: displayConfig.legacyAppearance === true,
    },
    customColors: asJsonObject(timerAppearance.customColors),
    timersColors: asJsonObject(timerAppearance.timersColors),
    alwaysVisibleExpiredTimers: asJsonObject(
      effectiveTimers.alwaysVisibleExpiredTimers,
    ),
    defaultColorNames: asJsonObject(timerAppearance.defaultColorNames),
    overriddenDefaultColors: asJsonObject(
      timerAppearance.overriddenDefaultColors,
    ),
    hiddenDefaultColors: asStringArray(timerAppearance.hiddenDefaultColors),
    timerFiltersEnabled: effectiveTimers.timerFiltersEnabled === true,
    colorFiltersEnabled: effectiveTimers.colorFiltersEnabled === true,
    timersSortOrder,
    syncEnabled: effectiveTimers.syncEnabled !== false,
    createdAt: updatedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

const mapGuildSettingsResponse = (
  userId: string,
  guildId: string,
  response: SettingsDocumentsResponse,
) => {
  const timers = response.domains.timers;
  const updatedAt = timers?.updatedAt ?? NEVER_STORED_AT;

  return {
    userId,
    guildId,
    hiddenTimers: asStringArray(timers?.effective.hiddenTimers),
    pinnedTimers: asStringArray(timers?.effective.pinnedTimers),
    createdAt: updatedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

const LOCAL_OBJECT_FIELDS = [
  "generalConfig",
  "displayConfig",
  "customColors",
  "timersColors",
  "alwaysVisibleExpiredTimers",
  "defaultColorNames",
  "overriddenDefaultColors",
] as const;

const isBoolean = Schema.is(Schema.Boolean);

const LOCAL_BOOLEAN_FIELDS = [
  "timerFiltersEnabled",
  "colorFiltersEnabled",
  "syncEnabled",
] as const;

/**
 * Copies only the settings the browser actually stored; a missing field keeps
 * the stored or catalog value instead of being written as a guessed default.
 */
const extractGlobalSettingsFromLocal = (
  localData: MigrateTimerSettingsRequest["localData"],
) => {
  const settings: JsonObject = {};

  for (const field of LOCAL_OBJECT_FIELDS) {
    if (Predicate.isObject(localData[field])) {
      settings[field] = asJsonObject(localData[field]);
    }
  }

  if (Array.isArray(localData.hiddenDefaultColors)) {
    settings.hiddenDefaultColors = asStringArray(localData.hiddenDefaultColors);
  }

  for (const field of LOCAL_BOOLEAN_FIELDS) {
    const value = localData[field];

    if (isBoolean(value)) settings[field] = value;
  }

  if (
    localData.timersSortOrder === "asc" ||
    localData.timersSortOrder === "desc"
  ) {
    settings.timersSortOrder = localData.timersSortOrder;
  }

  return settings;
};

const extractGuildSettingsFromLocal = (
  localData: MigrateTimerSettingsRequest["localData"],
) => {
  const hiddenTimers = asRecord(localData.hiddenTimers);
  const pinnedTimers = asRecord(localData.pinnedTimers);

  const guildIds = new Set([
    ...Object.keys(hiddenTimers),
    ...Object.keys(pinnedTimers),
  ]);

  const guildSettings: Record<string, UpdateOrganizationTimerSettingsRequest> =
    {};

  for (const guildId of guildIds) {
    const settings: Types.Mutable<UpdateOrganizationTimerSettingsRequest> = {};

    if (guildId in hiddenTimers) {
      settings.hiddenTimers = asStringArray(hiddenTimers[guildId]);
    }

    if (guildId in pinnedTimers) {
      settings.pinnedTimers = asStringArray(pinnedTimers[guildId]);
    }

    guildSettings[guildId] = settings;
  }

  return guildSettings;
};

export const makeTimerSettings = (
  settingsDocuments: SettingsDocuments,
): TimerSettings => {
  const getGlobalSettings = (userId: string) =>
    settingsDocuments
      .getPreferences(userId, { domains: ["appearance", "timers"] })
      .pipe(
        Effect.map((response) => mapGlobalSettingsResponse(userId, response)),
      );

  const globalOperations = (userId: string, dto: JsonObject) => {
    const appearanceSet: JsonObject = {};
    const timersSet: JsonObject = {};

    for (const [key, value] of Object.entries(dto)) {
      if (APPEARANCE_FIELDS.some((field) => field === key)) {
        appearanceSet[key] = value;
      } else {
        timersSet[key] = value;
      }
    }

    return [
      ...(Object.keys(appearanceSet).length > 0
        ? [
            {
              domain: "appearance" as const,
              scope: { type: "USER" as const, id: userId },
              set: { timers: asJsonObject(appearanceSet) },
              unset: [],
            },
          ]
        : []),
      ...(Object.keys(timersSet).length > 0
        ? [
            {
              domain: "timers" as const,
              scope: { type: "USER" as const, id: userId },
              set: asJsonObject(timersSet),
              unset: [],
            },
          ]
        : []),
    ];
  };

  const guildOperation = (
    guildId: string,
    dto: UpdateOrganizationTimerSettingsRequest,
  ) => ({
    domain: "timers" as const,
    scope: { type: "GUILD" as const, id: guildId },
    set: { ...dto },
    unset: [],
  });

  const updateGlobalSettings = (userId: string, dto: JsonObject) => {
    const operations = globalOperations(userId, dto);

    return operations.length === 0
      ? getGlobalSettings(userId)
      : settingsDocuments
          .patchPreferences(userId, { operations })
          .pipe(
            Effect.map((response) =>
              mapGlobalSettingsResponse(userId, response),
            ),
          );
  };

  const getGuildSettings = (userId: string, guildId: string) =>
    settingsDocuments
      .getPreferences(userId, { domains: ["timers"], guildId })
      .pipe(
        Effect.map((response) =>
          mapGuildSettingsResponse(userId, guildId, response),
        ),
      );

  const updateGuildSettings = (
    userId: string,
    guildId: string,
    dto: UpdateOrganizationTimerSettingsRequest,
  ) =>
    settingsDocuments
      .patchPreferences(userId, {
        operations: [guildOperation(guildId, dto)],
      })
      .pipe(
        Effect.map((response) =>
          mapGuildSettingsResponse(userId, guildId, response),
        ),
      );

  const migrateSettings = (
    userId: string,
    dto: MigrateTimerSettingsRequest,
  ): TimerEffect =>
    Effect.gen(function* () {
      const { localData, conflictResolution = "local" } = dto;

      const existingResponse = yield* settingsDocuments.getPreferences(userId, {
        domains: ["appearance", "timers"],
      });

      const hasRemoteSettings = [
        ...(existingResponse.domains.appearance?.layers ?? []),
        ...(existingResponse.domains.timers?.layers ?? []),
      ].some((layer) => layer.scope.type === "USER");

      if (hasRemoteSettings && conflictResolution === "remote") {
        return {
          global: mapGlobalSettingsResponse(userId, existingResponse),
          message: "Using remote (backend) settings",
        };
      }

      const guildSettings = Object.entries(
        extractGuildSettingsFromLocal(localData),
      );

      // One transaction for the whole import: a guild the user cannot access
      // rejects the migration before the global settings are written.
      const operations = [
        ...globalOperations(userId, extractGlobalSettingsFromLocal(localData)),
        ...guildSettings.map(([guildId, settings]) =>
          guildOperation(guildId, settings),
        ),
      ];

      if (operations.length > 0) {
        yield* settingsDocuments.applyOperations(userId, operations);
      }

      const global = yield* getGlobalSettings(userId);

      const guilds = yield* Effect.forEach(
        guildSettings,
        ([guildId]) => getGuildSettings(userId, guildId),
        { concurrency: "unbounded" },
      );

      return { global, guilds, message: "Migration completed successfully" };
    });

  return {
    getGlobalSettings,
    updateGlobalSettings,
    getGuildSettings,
    updateGuildSettings,
    migrateSettings,
  };
};
