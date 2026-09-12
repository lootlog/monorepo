/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import type {
  UpdateSoundSettingsPayload,
  UserSoundSettings,
} from "@lootlog/schema/sound-settings";
import { normalizeSoundSettings } from "@/lib/api/generated-helpers";
import {
  selectSettingsValue,
  type SettingsDocuments,
} from "./settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";
import { useSettingsSaveStatus } from "./settings-save-status.store";
import { useSettingsDocuments } from "./use-settings-documents";

const soundSettingsCache = new WeakMap<SettingsDocuments, UserSoundSettings>();

/** Sound settings as the playback and settings features consume them. */
export const getSoundSettingsFromDocuments = (
  documents: SettingsDocuments | undefined,
): UserSoundSettings | undefined => {
  if (!documents?.domains.sounds) return undefined;
  const cached = soundSettingsCache.get(documents);

  if (cached) return cached;

  const settings = normalizeSoundSettings({
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
    createdAt: documents.domains.sounds.updatedAt ?? "",
    updatedAt: documents.domains.sounds.updatedAt ?? "",
  });

  soundSettingsCache.set(documents, settings);

  return settings;
};

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
  const status = useSettingsSaveStatus();

  const mutate = ({
    masterVolume: _deviceLocalMasterVolume,
    ...payload
  }: UpdateSoundSettingsPayload) => {
    const set: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) set[key] = value;
    }

    enqueueSettingsPatch({ domain: "sounds", set });
  };

  return { mutate, isPending: status === "saving" };
};
