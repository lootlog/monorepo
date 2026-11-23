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
  enabled?: boolean;
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

export interface TimerSoundSettings {
  timersConfig: SoundCategoryConfig;
  timerWindowSoonSound: boolean;
  timerWindowSoonMinutes: number;
  timerWindowOpenSound: boolean;
  timerWindowEndSound: boolean;
  timerSoundNpcNames: string[];
}

type SoundSettingsPatch = Partial<
  Omit<SoundSettings, `${string}Config`> &
    Omit<TimerSoundSettings, "timersConfig"> & {
      notificationsConfig: Record<string, Partial<NpcTypeSoundConfig>>;
      detectorConfig: Record<string, Partial<NpcTypeSoundConfig>>;
      timersConfig: Record<string, Partial<NpcTypeSoundConfig>>;
    }
>;

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
        ...(config.enabled === true && { enabled: true }),
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

const getSoundSettingsFromDocuments = (
  documents: SettingsDocuments | undefined,
): SoundSettings | undefined =>
  documents?.domains.sounds ? projectSoundSettings(documents) : undefined;

const projectTimerSoundSettings = memoizeByDocuments(
  (documents): TimerSoundSettings => ({
    timersConfig: normalizeSoundCategoryConfig(
      selectSettingsValue(documents, "sounds.timersConfig"),
    ),
    timerWindowSoonSound: selectSettingsValue(
      documents,
      "sounds.timerWindowSoonSound",
    ),
    timerWindowSoonMinutes: selectSettingsValue(
      documents,
      "sounds.timerWindowSoonMinutes",
    ),
    timerWindowOpenSound: selectSettingsValue(
      documents,
      "sounds.timerWindowOpenSound",
    ),
    timerWindowEndSound: selectSettingsValue(
      documents,
      "sounds.timerWindowEndSound",
    ),
    timerSoundNpcNames: selectSettingsValue(
      documents,
      "sounds.timerSoundNpcNames",
    ),
  }),
);

export const readSoundSettings = () =>
  getSoundSettingsFromDocuments(readCurrentSettingsDocuments());

export const useSoundSettings = () => {
  const query = useSettingsDocuments();

  return {
    ...query,
    data: getSoundSettingsFromDocuments(query.data),
  };
};

export const useTimerSoundSettings = (): TimerSoundSettings | undefined => {
  const { data: documents } = useSettingsDocuments();

  return documents?.domains.sounds
    ? projectTimerSoundSettings(documents)
    : undefined;
};

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
