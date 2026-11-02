import type {
  UpdateSoundSettingsPayload,
  UserSoundSettings,
} from "@lootlog/schema/sound-settings";
import { normalizeSoundSettings } from "@/lib/api/generated-helpers";
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

const projectSoundSettings = memoizeByDocuments(
  (documents): UserSoundSettings =>
    normalizeSoundSettings({
      userId: "",
      masterVolume: 0.5,
      notificationsVolume: selectSettingsValue(
        documents,
        "sounds.notificationsVolume",
      ),
      detectorVolume: selectSettingsValue(documents, "sounds.detectorVolume"),
      timersVolume: selectSettingsValue(documents, "sounds.timersVolume"),
      pingsVolume: selectSettingsValue(documents, "sounds.pingsVolume"),
      notificationsConfig: selectSettingsValue(
        documents,
        "sounds.notificationsConfig",
      ),
      detectorConfig: selectSettingsValue(documents, "sounds.detectorConfig"),
      timersConfig: selectSettingsValue(documents, "sounds.timersConfig"),
      createdAt: documents.domains.sounds?.updatedAt ?? "",
      updatedAt: documents.domains.sounds?.updatedAt ?? "",
    }),
);

/** Sound settings as the playback and settings features consume them. */
const getSoundSettingsFromDocuments = (
  documents: SettingsDocuments | undefined,
): UserSoundSettings | undefined =>
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
  const mutate = ({
    masterVolume: _deviceLocalMasterVolume,
    ...payload
  }: UpdateSoundSettingsPayload) => {
    const set: SettingsOperation["set"] = {};

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) set[key] = value;
    }

    enqueueSettingsPatch({ domain: "sounds", set });
  };

  return { mutate };
};
