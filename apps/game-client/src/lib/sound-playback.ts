import { queryClient } from "@/lib/query-client";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@/lib/api/generated/main/sound-settings/sound-settings";
import type { UserSoundSettings } from "@lootlog/types";

type SoundCategory = "notifications" | "detector" | "timers" | "pings";
type ConfigurableSoundCategory = Exclude<SoundCategory, "pings">;

let currentAudio: HTMLAudioElement | null = null;
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

export function playSound(category: SoundCategory, key: string): void {
  const settings = getSettings();
  if (!settings) return;

  const categoryVolume = settings[`${category}Volume`];
  const masterVolume = settings.masterVolume;

  if (masterVolume === 0 || categoryVolume === 0) return;

  const soundConfig =
    category === "pings"
      ? undefined
      : settings[`${category as ConfigurableSoundCategory}Config`]?.[key];
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
