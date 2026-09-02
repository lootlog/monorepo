import { queryClient } from "@/lib/query-client";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@lootlog/client/main";
import {
  disposeSoundPlayback,
  playSoundRequest,
} from "@/lib/shared-audio-playback";
import type { UserSoundSettings } from "@lootlog/schema/sound-settings";
import { useSettingsStore } from "@/store/settings.store";

type SoundCategory = "notifications" | "detector" | "timers" | "pings";
type ConfigurableSoundCategory = Exclude<SoundCategory, "pings">;

export type SoundPlaybackProfile = {
  playbackRate?: number;
  preservesPitch?: boolean;
};

const SOUND_SETTINGS_QUERY_KEY =
  getSoundSettingsControllerGetSettingsQueryKey();

function getSettings(): UserSoundSettings | undefined {
  const cached = queryClient.getQueryData<
    UserSoundSettings | { data: UserSoundSettings }
  >(SOUND_SETTINGS_QUERY_KEY);

  if (cached && "masterVolume" in cached) {
    return cached;
  }

  if (cached && "data" in cached) {
    return cached.data;
  }

  return undefined;
}

export function playSound(
  category: SoundCategory,
  key: string,
  profile: SoundPlaybackProfile = {},
): void {
  const settings = getSettings();
  if (!settings) return;

  const categoryVolume = settings[`${category}Volume`];
  const { masterVolume, soundsMuted } = useSettingsStore.getState();

  if (soundsMuted || masterVolume === 0 || categoryVolume === 0) return;

  const soundConfig =
    category === "pings"
      ? undefined
      : settings[`${category as ConfigurableSoundCategory}Config`]?.[key];
  const soundUrl =
    soundConfig?.soundUrl === "" || !soundConfig?.soundUrl
      ? DEFAULT_SOUND_URLS[key]
      : soundConfig.soundUrl;

  if (!soundUrl) return;

  playSoundRequest({
    url: soundUrl,
    volume: categoryVolume * masterVolume,
    ...profile,
  });
}

export { disposeSoundPlayback };
