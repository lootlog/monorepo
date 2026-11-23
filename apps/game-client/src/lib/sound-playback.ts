import {
  resolveCategorySoundUrl,
  type SoundCategory,
} from "@/lib/default-sounds";
import {
  readSoundSettings,
  type SoundSettings,
} from "@/lib/settings-persistence/use-sound-settings";
import {
  disposeSoundPlayback,
  playSoundRequest,
} from "@/lib/shared-audio-playback";
import { useSettingsStore } from "@/store/settings.store";

export type SoundPlaybackProfile = {
  playbackRate?: number;
  preservesPitch?: boolean;
};

const getSettings = (): SoundSettings | undefined => readSoundSettings();

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

  const soundUrl = resolveCategorySoundUrl(settings, category, key);

  if (!soundUrl) return;

  playSoundRequest({
    url: soundUrl,
    volume: categoryVolume * masterVolume,
    ...profile,
  });
}

export { disposeSoundPlayback };
