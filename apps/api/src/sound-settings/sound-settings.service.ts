import type { NpcTypeSoundConfig } from "@lootlog/schema/sound-settings";
import type { SettingsDomainResolution } from "@lootlog/schema/settings-documents";
import {
  NEVER_STORED_AT,
  type SettingsDocuments,
  type SettingsDocumentsFailure,
} from "#src/settings-documents/settings-documents.service";
import { decodeSettingsRecord } from "@lootlog/domain/settings-paths";
import { Effect, Predicate } from "effect";
import type { UpdateSoundSettingsRequest } from "#src/contracts/sound-settings/schemas";

type SoundConfigMap = Record<string, NpcTypeSoundConfig>;

type SoundEffect = Effect.Effect<unknown, SettingsDocumentsFailure>;

export interface SoundSettings {
  readonly getSettings: (userId: string) => SoundEffect;
  readonly updateSettings: (
    userId: string,
    dto: UpdateSoundSettingsRequest,
  ) => SoundEffect;
}

const getDefaultSettingsData = () => {
  const defaultNpcConfig = {
    ELITE2: { volume: 0.5, soundUrl: "" },
    HERO: { volume: 0.5, soundUrl: "" },
    EVENT_HERO: { volume: 0.5, soundUrl: "" },
    COLOSSUS: { volume: 0.5, soundUrl: "" },
    TITAN: { volume: 0.5, soundUrl: "" },
    HERO_TRACKER: { volume: 0.5, soundUrl: "" },
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
): SoundConfigMap => {
  const merged: SoundConfigMap = structuredClone(defaults);

  if (Predicate.isObject(storedValue)) {
    for (const [key, storedConfig] of Object.entries(storedValue)) {
      if (!Predicate.isObject(storedConfig)) continue;
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

  return merged;
};

const toCompatibilitySettings = (
  userId: string,
  resolution: SettingsDomainResolution | undefined,
) => {
  const defaults = getDefaultSettingsData();
  const effective = resolution?.effective ?? {};
  const updatedAt = resolution?.updatedAt ?? NEVER_STORED_AT;

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
    ),
    detectorConfig: mergeSoundConfigMap(
      effective.detectorConfig,
      defaults.detectorConfig,
    ),
    timersConfig: mergeSoundConfigMap(
      effective.timersConfig,
      defaults.timersConfig,
    ),
    createdAt: updatedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
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
        // The master volume is a device setting (`DEVICE_SETTINGS_CATALOG`);
        // the route accepts it for old clients and never stores it.
        const { masterVolume: _deviceLocalMasterVolume, ...patch } = dto;

        // Each changed leaf is written by path inside the document
        // transaction, so concurrent patches of different sounds both land.
        const set = decodeSettingsRecord(patch);

        if (Object.keys(set).length === 0) return yield* getSettings(userId);

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
