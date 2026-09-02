import { Injectable } from "@nestjs/common";
import {
  SettingsDocumentsService,
  type SettingsDocumentsResponse,
} from "#src/settings-documents/settings-documents.service";
import type { MigrateTimerSettingsDto } from "./dto/migrate-timer-settings.dto.js";
import type { UpdateGuildTimerSettingsDto } from "./dto/update-guild-timer-settings.dto.js";
import type { UpdateTimerSettingsDto } from "./dto/update-timer-settings.dto.js";

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

@Injectable()
export class TimerSettingsService {
  constructor(
    private readonly settingsDocumentsService: SettingsDocumentsService,
  ) {}

  async getGlobalSettings(userId: string) {
    const response = await this.settingsDocumentsService.getPreferences(
      userId,
      {
        domains: ["appearance", "timers"],
      },
    );

    return this.mapGlobalSettingsResponse(userId, response);
  }

  async updateGlobalSettings(userId: string, dto: UpdateTimerSettingsDto) {
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
              set: { timers: appearanceSet },
              unset: [],
            },
          ]
        : []),
      ...(Object.keys(timersSet).length > 0
        ? [
            {
              domain: "timers" as const,
              scope: { type: "USER" as const, id: userId },
              set: timersSet,
              unset: [],
            },
          ]
        : []),
    ];

    if (operations.length === 0) {
      return this.getGlobalSettings(userId);
    }

    const response = await this.settingsDocumentsService.patchPreferences(
      userId,
      {
        operations,
      },
    );

    return this.mapGlobalSettingsResponse(userId, response);
  }

  async getGuildSettings(userId: string, guildId: string) {
    const response = await this.settingsDocumentsService.getPreferences(
      userId,
      {
        domains: ["timers"],
        guildId,
      },
    );

    return this.mapGuildSettingsResponse(userId, guildId, response);
  }

  async updateGuildSettings(
    userId: string,
    guildId: string,
    dto: UpdateGuildTimerSettingsDto,
  ) {
    const response = await this.settingsDocumentsService.patchPreferences(
      userId,
      {
        operations: [
          {
            domain: "timers",
            scope: { type: "GUILD", id: guildId },
            set: { ...dto },
            unset: [],
          },
        ],
      },
    );

    return this.mapGuildSettingsResponse(userId, guildId, response);
  }

  async migrateSettings(userId: string, dto: MigrateTimerSettingsDto) {
    const { localData, conflictResolution = "local" } = dto;
    const existingResponse = await this.settingsDocumentsService.getPreferences(
      userId,
      {
        domains: ["appearance", "timers"],
      },
    );
    const hasRemoteSettings = [
      ...(existingResponse.domains.appearance?.layers ?? []),
      ...(existingResponse.domains.timers?.layers ?? []),
    ].some((layer) => layer.scope.type === "USER");

    if (hasRemoteSettings && conflictResolution === "remote") {
      return {
        global: this.mapGlobalSettingsResponse(userId, existingResponse),
        message: "Using remote (backend) settings",
      };
    }

    const global = await this.updateGlobalSettings(
      userId,
      this.extractGlobalSettingsFromLocal(
        localData,
      ) as unknown as UpdateTimerSettingsDto,
    );
    const guilds = await Promise.all(
      Object.entries(this.extractGuildSettingsFromLocal(localData)).map(
        ([guildId, settings]) =>
          this.updateGuildSettings(userId, guildId, settings),
      ),
    );

    return {
      global,
      guilds,
      message: "Migration completed successfully",
    };
  }

  private mapGlobalSettingsResponse(
    userId: string,
    response: SettingsDocumentsResponse,
  ) {
    const appearance = response.domains.appearance;
    const timers = response.domains.timers;
    const timerAppearance = asRecord(appearance?.effective.timers);
    const effectiveTimers = timers?.effective ?? {};
    const updatedAtValues = [appearance?.updatedAt, timers?.updatedAt]
      .filter((value): value is string => value !== undefined)
      .sort();
    const updatedAtValue = updatedAtValues[updatedAtValues.length - 1];
    const updatedAt = updatedAtValue ? new Date(updatedAtValue) : new Date();
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
      createdAt: updatedAt,
      updatedAt,
    };
  }

  private mapGuildSettingsResponse(
    userId: string,
    guildId: string,
    response: SettingsDocumentsResponse,
  ) {
    const timers = response.domains.timers;
    const updatedAt = timers?.updatedAt
      ? new Date(timers.updatedAt)
      : new Date();

    return {
      userId,
      guildId,
      hiddenTimers: asStringArray(timers?.effective.hiddenTimers),
      pinnedTimers: asStringArray(timers?.effective.pinnedTimers),
      createdAt: updatedAt,
      updatedAt,
    };
  }

  private extractGlobalSettingsFromLocal(localData: Record<string, unknown>) {
    return {
      generalConfig: asRecord(localData.generalConfig),
      displayConfig: asRecord(localData.displayConfig),
      customColors: asRecord(localData.customColors),
      timersColors: asRecord(localData.timersColors),
      alwaysVisibleExpiredTimers: asRecord(
        localData.alwaysVisibleExpiredTimers,
      ),
      defaultColorNames: asRecord(localData.defaultColorNames),
      overriddenDefaultColors: asRecord(localData.overriddenDefaultColors),
      hiddenDefaultColors: asStringArray(localData.hiddenDefaultColors),
      timerFiltersEnabled: localData.timerFiltersEnabled !== false,
      colorFiltersEnabled: localData.colorFiltersEnabled === true,
      timersSortOrder:
        localData.timersSortOrder === "asc"
          ? ("asc" as const)
          : ("desc" as const),
      syncEnabled: localData.syncEnabled !== false,
    };
  }

  private extractGuildSettingsFromLocal(localData: Record<string, unknown>) {
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
  }
}
