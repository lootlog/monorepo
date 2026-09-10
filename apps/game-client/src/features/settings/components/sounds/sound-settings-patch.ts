import type { UpdateSoundSettingsDto } from "@lootlog/client/main";

type SoundConfigKey = "notificationsConfig" | "detectorConfig" | "timersConfig";

const SOUND_CONFIG_KEYS: SoundConfigKey[] = [
  "notificationsConfig",
  "detectorConfig",
  "timersConfig",
];

export const mergeSoundSettingsPatches = (
  current: UpdateSoundSettingsDto,
  incoming: UpdateSoundSettingsDto,
): UpdateSoundSettingsDto => {
  const merged: UpdateSoundSettingsDto = { ...current, ...incoming };

  for (const configKey of SOUND_CONFIG_KEYS) {
    const currentConfig = current[configKey];
    const incomingConfig = incoming[configKey];

    if (!currentConfig && !incomingConfig) {
      continue;
    }

    const entries = new Map(Object.entries(currentConfig ?? {}));

    for (const [key, partialConfig] of Object.entries(incomingConfig ?? {})) {
      entries.set(key, {
        ...entries.get(key),
        ...partialConfig,
      });
    }

    merged[configKey] = Object.fromEntries(entries);
  }

  return merged;
};
