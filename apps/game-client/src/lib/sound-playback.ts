import { getDefaultSoundUrl } from "@/features/settings/config/default-sounds";
import { readSoundSettings } from "@/features/settings/persistence/use-sound-settings";
import {
  disposeSoundPlayback,
  playSoundRequest,
} from "@/lib/shared-audio-playback";
import type { UserSoundSettings } from "@lootlog/schema/sound-settings";
import { useSettingsStore } from "@/store/settings.store";

type SoundCategory = "notifications" | "detector" | "timers" | "pings";

export type SoundPlaybackProfile = {
  playbackRate?: number;
  preservesPitch?: boolean;
};

const getSettings = (): UserSoundSettings | undefined => readSoundSettings();

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
    category === "pings" ? undefined : settings[`${category}Config`]?.[key];

  const soundUrl =
    soundConfig?.soundUrl === "" || !soundConfig?.soundUrl
      ? getDefaultSoundUrl(key)
      : soundConfig.soundUrl;

  if (!soundUrl) return;

  playSoundRequest({
    url: soundUrl,
    volume: categoryVolume * masterVolume,
    ...profile,
  });
}

export { disposeSoundPlayback };
