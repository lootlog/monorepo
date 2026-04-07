import { queryClient } from "@/lib/query-client";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import type { UserSoundSettings } from "@lootlog/types";

type SoundCategory = "notifications" | "detector" | "timers";

let currentAudio: HTMLAudioElement | null = null;

function getSettings(): UserSoundSettings | undefined {
  const cached = queryClient.getQueryData<
    UserSoundSettings | { data: UserSoundSettings }
  >(["sound-settings"]);

  if (cached && "masterVolume" in cached) {
    return cached;
  }

  if (cached && "data" in cached) {
    return cached.data;
  }

  return undefined;
}

export function playSound(category: SoundCategory, key: string): void {
  const settings = getSettings();
  if (!settings) return;

  const categoryVolume = settings[`${category}Volume`];
  const masterVolume = settings.masterVolume;

  if (masterVolume === 0 || categoryVolume === 0) return;

  const soundConfig = settings[`${category}Config`]?.[key];
  const soundUrl =
    soundConfig?.soundUrl === "" || !soundConfig?.soundUrl
      ? DEFAULT_SOUND_URLS[key]
      : soundConfig.soundUrl;

  if (!soundUrl) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const audio = new Audio(soundUrl);
  audio.volume = categoryVolume * masterVolume;
  currentAudio = audio;

  audio.play().catch(() => {});

  audio.onended = () => {
    if (currentAudio === audio) {
      currentAudio = null;
    }
  };
}
