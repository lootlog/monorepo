import type { UpdateSoundSettingsDto } from "@/lib/api/generated/main/model";
import type { NpcTypeSoundConfig } from "@lootlog/types";

type SoundConfigKey = "notificationsConfig" | "detectorConfig" | "timersConfig";
type SoundConfigPatch = Record<string, Partial<NpcTypeSoundConfig> | undefined>;

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
  const mergedConfigs = merged as unknown as Record<
    SoundConfigKey,
    SoundConfigPatch | undefined
  >;

  for (const configKey of SOUND_CONFIG_KEYS) {
    const currentConfig = current[configKey] as SoundConfigPatch | undefined;
    const incomingConfig = incoming[configKey] as SoundConfigPatch | undefined;
    if (!currentConfig && !incomingConfig) {
      continue;
    }

    const nextConfig: SoundConfigPatch = {
      ...currentConfig,
      ...incomingConfig,
    };
    for (const [key, partialConfig] of Object.entries(incomingConfig ?? {})) {
      nextConfig[key] = {
        ...currentConfig?.[key],
        ...partialConfig,
      };
    }
    mergedConfigs[configKey] = nextConfig;
  }

  return merged;
};
