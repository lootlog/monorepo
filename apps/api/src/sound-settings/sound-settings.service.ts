import type { NpcTypeSoundConfig } from "@lootlog/schema/sound-settings";
import type { SettingsDomainResolution } from "@lootlog/schema/settings-documents";
import type {
  SettingsDocuments,
  SettingsDocumentsFailure,
} from "#src/settings-documents/settings-documents.service";
import { Effect } from "effect";
import type { UpdateSoundSettingsDto } from "./dto/update-sound-settings.dto.js";

type SoundConfigMap = Record<string, NpcTypeSoundConfig>;
type SoundConfigPatch = Record<string, Partial<NpcTypeSoundConfig> | undefined>;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type SoundEffect = Effect.Effect<unknown, SettingsDocumentsFailure>;

export interface SoundSettings {
  readonly getSettings: (userId: string) => SoundEffect;
  readonly updateSettings: (
    userId: string,
    dto: UpdateSoundSettingsDto,
  ) => SoundEffect;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getDefaultSettingsData = () => {
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
};

const getVolume = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const mergeSoundConfigMap = (
  storedValue: unknown,
  defaults: SoundConfigMap,
  patch?: SoundConfigPatch,
): SoundConfigMap => {
  const merged: SoundConfigMap = structuredClone(defaults);
  if (isRecord(storedValue)) {
    for (const [key, storedConfig] of Object.entries(storedValue)) {
      if (!isRecord(storedConfig)) continue;
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
      if (!partialConfig) continue;
      merged[key] = {
        ...(merged[key] ?? { volume: 0.5, soundUrl: "" }),
        ...partialConfig,
      };
    }
  }
  return merged;
};

const toCompatibilitySettings = (
  userId: string,
  resolution: SettingsDomainResolution | undefined,
) => {
  const defaults = getDefaultSettingsData();
  const effective = resolution?.effective ?? {};
  const updatedAt = resolution?.updatedAt
    ? new Date(resolution.updatedAt)
    : new Date();
  return {
    userId,
    masterVolume: defaults.masterVolume,
    notificationsVolume: getVolume(
      effective.notificationsVolume,
      defaults.notificationsVolume,
    ),
    detectorVolume: getVolume(
      effective.detectorVolume,
      defaults.detectorVolume,
    ),
    timersVolume: getVolume(effective.timersVolume, defaults.timersVolume),
    pingsVolume: getVolume(effective.pingsVolume, defaults.pingsVolume),
    notificationsConfig: mergeSoundConfigMap(
      effective.notificationsConfig,
      defaults.notificationsConfig,
    ) as unknown as JsonValue,
    detectorConfig: mergeSoundConfigMap(
      effective.detectorConfig,
      defaults.detectorConfig,
    ) as unknown as JsonValue,
    timersConfig: mergeSoundConfigMap(
      effective.timersConfig,
      defaults.timersConfig,
    ) as unknown as JsonValue,
    createdAt: updatedAt,
    updatedAt,
  };
};

export const makeSoundSettings = (
  settingsDocuments: SettingsDocuments,
): SoundSettings => {
  const getSettings = (userId: string) =>
    settingsDocuments
      .getPreferences(userId, { domains: ["sounds"] })
      .pipe(
        Effect.map((response) =>
          toCompatibilitySettings(userId, response.domains.sounds),
        ),
      );

  return {
    getSettings,
    updateSettings: (userId, dto) =>
      Effect.gen(function* () {
        const currentSettings = yield* getSettings(userId);
        const {
          masterVolume: _deviceLocalMasterVolume,
          notificationsConfig,
          detectorConfig,
          timersConfig,
          ...scalarPatch
        } = dto;
        const set: Record<string, unknown> = { ...scalarPatch };
        const defaults = getDefaultSettingsData();
        if (notificationsConfig) {
          set.notificationsConfig = mergeSoundConfigMap(
            currentSettings.notificationsConfig,
            defaults.notificationsConfig,
            notificationsConfig,
          );
        }
        if (detectorConfig) {
          set.detectorConfig = mergeSoundConfigMap(
            currentSettings.detectorConfig,
            defaults.detectorConfig,
            detectorConfig,
          );
        }
        if (timersConfig) {
          set.timersConfig = mergeSoundConfigMap(
            currentSettings.timersConfig,
            defaults.timersConfig,
            timersConfig,
          );
        }
        if (Object.keys(set).length === 0) return currentSettings;
        const response = yield* settingsDocuments.patchPreferences(userId, {
          operations: [
            {
              domain: "sounds",
              scope: { type: "USER", id: userId },
              set,
              unset: [],
            },
          ],
        });
        return toCompatibilitySettings(userId, response.domains.sounds);
      }),
  };
};
