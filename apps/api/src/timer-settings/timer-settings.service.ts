import type {
  SettingsDocuments,
  SettingsDocumentsFailure,
  SettingsDocumentsResponse,
} from "#src/settings-documents/settings-documents.service";
import { Effect } from "effect";
import type {
  MigrateTimerSettingsDto,
  UpdateGuildTimerSettingsDto,
  UpdateTimerSettingsDto,
} from "#src/http-api/contracts/timer-settings/schemas";

const APPEARANCE_FIELDS = [
  "displayConfig",
  "customColors",
  "timersColors",
  "defaultColorNames",
  "overriddenDefaultColors",
  "hiddenDefaultColors",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };
type TimerEffect = Effect.Effect<unknown, SettingsDocumentsFailure>;

export interface TimerSettings {
  readonly getGlobalSettings: (userId: string) => TimerEffect;
  readonly updateGlobalSettings: (
    userId: string,
    dto: UpdateTimerSettingsDto,
  ) => TimerEffect;
  readonly getGuildSettings: (userId: string, guildId: string) => TimerEffect;
  readonly updateGuildSettings: (
    userId: string,
    guildId: string,
    dto: UpdateGuildTimerSettingsDto,
  ) => TimerEffect;
  readonly migrateSettings: (
    userId: string,
    dto: MigrateTimerSettingsDto,
  ) => TimerEffect;
}

const asRecord = (value: unknown) => (isRecord(value) ? value : {});
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
  if (!isRecord(value)) return null;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, asJsonValue(entry)]),
  );
};
const asJsonObject = (value: unknown): JsonObject => {
  const normalized = asJsonValue(value);
  return isRecord(normalized) ? normalized : {};
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
  const effectiveTimers = timers?.effective ?? {};
  const updatedAtValues = [appearance?.updatedAt, timers?.updatedAt]
    .filter((value): value is Date => value !== undefined)
    .sort((left, right) => left.getTime() - right.getTime());
  const updatedAtValue = updatedAtValues[updatedAtValues.length - 1];
  const updatedAt = updatedAtValue ?? new Date();
  const timersSortOrder: "asc" | "desc" =
    effectiveTimers.timersSortOrder === "desc" ? "desc" : "asc";

  return {
    userId,
    generalConfig: asJsonObject(effectiveTimers.generalConfig),
    displayConfig: asJsonObject(timerAppearance.displayConfig),
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
  const updatedAt = timers?.updatedAt ?? new Date();
  return {
    userId,
    guildId,
    hiddenTimers: asStringArray(timers?.effective.hiddenTimers),
    pinnedTimers: asStringArray(timers?.effective.pinnedTimers),
    createdAt: updatedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

const extractGlobalSettingsFromLocal = (
  localData: Record<string, unknown>,
) => ({
  generalConfig: asRecord(localData.generalConfig),
  displayConfig: asRecord(localData.displayConfig),
  customColors: asRecord(localData.customColors),
  timersColors: asRecord(localData.timersColors),
  alwaysVisibleExpiredTimers: asRecord(localData.alwaysVisibleExpiredTimers),
  defaultColorNames: asRecord(localData.defaultColorNames),
  overriddenDefaultColors: asRecord(localData.overriddenDefaultColors),
  hiddenDefaultColors: asStringArray(localData.hiddenDefaultColors),
  timerFiltersEnabled: localData.timerFiltersEnabled !== false,
  colorFiltersEnabled: localData.colorFiltersEnabled === true,
  timersSortOrder:
    localData.timersSortOrder === "asc" ? ("asc" as const) : ("desc" as const),
  syncEnabled: localData.syncEnabled !== false,
});

const extractGuildSettingsFromLocal = (localData: Record<string, unknown>) => {
  const hiddenTimers = asRecord(localData.hiddenTimers);
  const pinnedTimers = asRecord(localData.pinnedTimers);
  const guildIds = new Set([
    ...Object.keys(hiddenTimers),
    ...Object.keys(pinnedTimers),
  ]);
  const guildSettings: Record<
    string,
    { hiddenTimers: string[]; pinnedTimers: string[] }
  > = {};

  for (const guildId of guildIds) {
    guildSettings[guildId] = {
      hiddenTimers: asStringArray(hiddenTimers[guildId]),
      pinnedTimers: asStringArray(pinnedTimers[guildId]),
    };
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

  const updateGlobalSettings = (
    userId: string,
    dto: UpdateTimerSettingsDto,
  ) => {
    const appearanceSet: Record<string, unknown> = {};
    const timersSet: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (
        APPEARANCE_FIELDS.includes(key as (typeof APPEARANCE_FIELDS)[number])
      ) {
        appearanceSet[key] = value;
      } else {
        timersSet[key] = value;
      }
    }
    const operations = [
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
    dto: UpdateGuildTimerSettingsDto,
  ) =>
    settingsDocuments
      .patchPreferences(userId, {
        operations: [
          {
            domain: "timers",
            scope: { type: "GUILD", id: guildId },
            set: { ...dto },
            unset: [],
          },
        ],
      })
      .pipe(
        Effect.map((response) =>
          mapGuildSettingsResponse(userId, guildId, response),
        ),
      );

  const migrateSettings = (
    userId: string,
    dto: MigrateTimerSettingsDto,
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

      const global = yield* updateGlobalSettings(
        userId,
        extractGlobalSettingsFromLocal(
          localData,
        ) as unknown as UpdateTimerSettingsDto,
      );
      const guilds = yield* Effect.forEach(
        Object.entries(extractGuildSettingsFromLocal(localData)),
        ([guildId, settings]) => updateGuildSettings(userId, guildId, settings),
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
