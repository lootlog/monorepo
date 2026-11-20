import { isPlainObject } from "es-toolkit";
import { getNumber, getString } from "@/lib/api/generated-helpers";
import {
  memoizeByDocuments,
  selectSettingsValue,
  type SettingsDocuments,
  type SettingsOperation,
} from "./settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";
import { useSettingsDocuments } from "./use-settings-documents";

export type NpcTypeSoundConfig = {
  volume: number;
  soundUrl: string;
};

type SoundCategoryConfig = Record<string, NpcTypeSoundConfig>;

export interface SoundSettings {
  notificationsVolume: number;
  detectorVolume: number;
  timersVolume: number;
  pingsVolume: number;
  notificationsConfig: SoundCategoryConfig;
  detectorConfig: SoundCategoryConfig;
  timersConfig: SoundCategoryConfig;
}

type SoundSettingsPatch = Partial<
  Omit<SoundSettings, `${string}Config`> & {
    notificationsConfig: Record<string, Partial<NpcTypeSoundConfig>>;
    detectorConfig: Record<string, Partial<NpcTypeSoundConfig>>;
    timersConfig: Record<string, Partial<NpcTypeSoundConfig>>;
  }
>;

// Stored category configs are opaque JSON; entries that are not objects are
// dropped and legacy numeric-string volumes are coerced.
const normalizeSoundCategoryConfig = (value: unknown): SoundCategoryConfig => {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(value).reduce<SoundCategoryConfig>(
    (result, [key, config]) => {
      if (!isPlainObject(config)) {
        return result;
      }

      result[key] = {
        volume: getNumber(config.volume, 0.5),
        soundUrl: getString(config.soundUrl),
      };

      return result;
    },
    {},
  );
};

const projectSoundSettings = memoizeByDocuments((documents): SoundSettings => ({
  notificationsVolume: selectSettingsValue(
    documents,
    "sounds.notificationsVolume",
  ),
  detectorVolume: selectSettingsValue(documents, "sounds.detectorVolume"),
  timersVolume: selectSettingsValue(documents, "sounds.timersVolume"),
  pingsVolume: selectSettingsValue(documents, "sounds.pingsVolume"),
  notificationsConfig: normalizeSoundCategoryConfig(
    selectSettingsValue(documents, "sounds.notificationsConfig"),
  ),
  detectorConfig: normalizeSoundCategoryConfig(
    selectSettingsValue(documents, "sounds.detectorConfig"),
  ),
  timersConfig: normalizeSoundCategoryConfig(
    selectSettingsValue(documents, "sounds.timersConfig"),
  ),
}));

/** Sound settings as the playback and settings features consume them. */
const getSoundSettingsFromDocuments = (
  documents: SettingsDocuments | undefined,
): SoundSettings | undefined =>
  documents?.domains.sounds ? projectSoundSettings(documents) : undefined;

export const readSoundSettings = () =>
  getSoundSettingsFromDocuments(readCurrentSettingsDocuments());

export const useSoundSettings = () => {
  const query = useSettingsDocuments();

  return {
    ...query,
    data: getSoundSettingsFromDocuments(query.data),
  };
};

/** Master volume and mute stay on the device; every other field is server-side. */
export const useUpdateSoundSettings = () => {
  const mutate = (payload: SoundSettingsPatch) => {
    const set: SettingsOperation["set"] = {};

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) set[key] = value;
    }

    enqueueSettingsPatch({ domain: "sounds", set });
  };

  return { mutate };
};
