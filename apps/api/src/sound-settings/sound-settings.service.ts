import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { Injectable } from "@nestjs/common";
import type {
  NpcTypeSoundConfig,
  SettingsDomainResolution,
} from "@lootlog/types";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import type { UpdateSoundSettingsDto } from "./dto/update-sound-settings.dto.js";

type JsonValue = DatabaseJsonValue;

type SoundConfigMap = Record<string, NpcTypeSoundConfig>;
type SoundConfigPatch = Record<string, Partial<NpcTypeSoundConfig> | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

@Injectable()
export class SoundSettingsService {
  constructor(
    private readonly settingsDocumentsService: SettingsDocumentsService,
  ) {}

  async getSettings(userId: string) {
    const response = await this.settingsDocumentsService.getPreferences(
      userId,
      {
        domains: ["sounds"],
      },
    );

    return this.toCompatibilitySettings(userId, response.domains.sounds);
  }

  async updateSettings(userId: string, dto: UpdateSoundSettingsDto) {
    const currentSettings = await this.getSettings(userId);
    const {
      masterVolume: _deviceLocalMasterVolume,
      notificationsConfig,
      detectorConfig,
      timersConfig,
      ...scalarPatch
    } = dto;
    const set: Record<string, unknown> = { ...scalarPatch };

    if (notificationsConfig) {
      set.notificationsConfig = this.mergeSoundConfigMap(
        currentSettings.notificationsConfig,
        this.getDefaultSettingsData().notificationsConfig,
        notificationsConfig,
      );
    }
    if (detectorConfig) {
      set.detectorConfig = this.mergeSoundConfigMap(
        currentSettings.detectorConfig,
        this.getDefaultSettingsData().detectorConfig,
        detectorConfig,
      );
    }
    if (timersConfig) {
      set.timersConfig = this.mergeSoundConfigMap(
        currentSettings.timersConfig,
        this.getDefaultSettingsData().timersConfig,
        timersConfig,
      );
    }

    if (Object.keys(set).length === 0) {
      return currentSettings;
    }

    const response = await this.settingsDocumentsService.patchPreferences(
      userId,
      {
        operations: [
          {
            domain: "sounds",
            scope: { type: "USER", id: userId },
            set,
            unset: [],
          },
        ],
      },
    );

    return this.toCompatibilitySettings(userId, response.domains.sounds);
  }

  private toCompatibilitySettings(
    userId: string,
    resolution: SettingsDomainResolution | undefined,
  ) {
    const defaults = this.getDefaultSettingsData();
    const effective = resolution?.effective ?? {};
    const updatedAt = resolution?.updatedAt
      ? new Date(resolution.updatedAt)
      : new Date();

    return {
      userId,
      masterVolume: defaults.masterVolume,
      notificationsVolume: this.getVolume(
        effective.notificationsVolume,
        defaults.notificationsVolume,
      ),
      detectorVolume: this.getVolume(
        effective.detectorVolume,
        defaults.detectorVolume,
      ),
      timersVolume: this.getVolume(
        effective.timersVolume,
        defaults.timersVolume,
      ),
      pingsVolume: this.getVolume(effective.pingsVolume, defaults.pingsVolume),
      notificationsConfig: this.mergeSoundConfigMap(
        effective.notificationsConfig,
        defaults.notificationsConfig,
      ) as unknown as JsonValue,
      detectorConfig: this.mergeSoundConfigMap(
        effective.detectorConfig,
        defaults.detectorConfig,
      ) as unknown as JsonValue,
      timersConfig: this.mergeSoundConfigMap(
        effective.timersConfig,
        defaults.timersConfig,
      ) as unknown as JsonValue,
      createdAt: updatedAt,
      updatedAt,
    };
  }

  private getVolume(value: unknown, fallback: number) {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : fallback;
  }

  private mergeSoundConfigMap(
    storedValue: unknown,
    defaults: SoundConfigMap,
    patch?: SoundConfigPatch,
  ): SoundConfigMap {
    const merged: SoundConfigMap = structuredClone(defaults);

    if (isRecord(storedValue)) {
      for (const [key, storedConfig] of Object.entries(storedValue)) {
        if (!isRecord(storedConfig)) {
          continue;
        }

        const fallback = merged[key] ?? { volume: 0.5, soundUrl: "" };
        merged[key] = {
          volume:
            typeof storedConfig.volume === "number"
              ? storedConfig.volume
              : fallback.volume,
          soundUrl:
            typeof storedConfig.soundUrl === "string"
              ? storedConfig.soundUrl
              : fallback.soundUrl,
        };
      }
    }

    if (patch) {
      for (const [key, partialConfig] of Object.entries(patch)) {
        if (!partialConfig) {
          continue;
        }

        merged[key] = {
          ...(merged[key] ?? { volume: 0.5, soundUrl: "" }),
          ...partialConfig,
        };
      }
    }

    return merged;
  }

  private getDefaultSettingsData() {
    const defaultNpcConfig = {
      ELITE2: { volume: 0.5, soundUrl: "" },
      HERO: { volume: 0.5, soundUrl: "" },
      COLOSSUS: { volume: 0.5, soundUrl: "" },
      TITAN: { volume: 0.5, soundUrl: "" },
    };

    return {
      masterVolume: 0.5,
      notificationsVolume: 0.5,
      detectorVolume: 0.5,
      timersVolume: 0.5,
      pingsVolume: 0,
      notificationsConfig: {
        ...defaultNpcConfig,
        message: { volume: 0.5, soundUrl: "" },
      },
      detectorConfig: defaultNpcConfig,
      timersConfig: defaultNpcConfig,
    };
  }
}
