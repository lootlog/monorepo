import { useRef } from "react";
import { useSoundSettings } from "@/hooks/api/use-sound-settings";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { useQueryClient } from "@tanstack/react-query";
import type { UserSoundSettings } from "@lootlog/types";
import { normalizeSoundSettings } from "@/lib/api/generated-helpers";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@/lib/api/generated/main/sound-settings/sound-settings";
import type { SoundSettingsResponseDto } from "@/lib/api/generated/main/model";

type SoundCategory = "notifications" | "detector" | "timers" | "pings";
type ConfigurableSoundCategory = Exclude<SoundCategory, "pings">;

const SOUND_SETTINGS_QUERY_KEY =
  getSoundSettingsControllerGetSettingsQueryKey();

export const useSoundPlayback = () => {
  const { data: soundSettingsData } = useSoundSettings();
  const queryClient = useQueryClient();
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundSettings = soundSettingsData
    ? normalizeSoundSettings(soundSettingsData)
    : undefined;

  const getLatestSettings = (): UserSoundSettings | undefined => {
    const cached = queryClient.getQueryData<SoundSettingsResponseDto>(
      SOUND_SETTINGS_QUERY_KEY,
    );

    if (cached) {
      return normalizeSoundSettings(cached);
    }

    return soundSettings;
  };

  const playSound = (category: SoundCategory, key: string) => {
    const settings = getLatestSettings();
    if (!settings) {
      return;
    }

    const categoryVolume = settings[`${category}Volume`];
    const masterVolume = settings.masterVolume;

    if (masterVolume === 0 || categoryVolume === 0) {
      return;
    }

    const soundConfig =
      category === "pings"
        ? undefined
        : settings[`${category as ConfigurableSoundCategory}Config`]?.[key];
    const soundUrl =
      soundConfig?.soundUrl === "" || !soundConfig?.soundUrl
        ? DEFAULT_SOUND_URLS[key]
        : soundConfig.soundUrl;

    if (!soundUrl) {
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(soundUrl);
    audio.volume = categoryVolume * masterVolume;
    currentAudioRef.current = audio;

    audio.play().catch(() => {});

    audio.onended = () => {
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };
  };

  const playSoundTest = (
    category: SoundCategory,
    key: string,
    customSoundUrl?: string,
  ) => {
    const settings = getLatestSettings();
    if (!settings) {
      return;
    }

    const categoryVolume = settings[`${category}Volume`];
    const masterVolume = settings.masterVolume;

    const soundConfig =
      category === "pings"
        ? undefined
        : settings[`${category as ConfigurableSoundCategory}Config`]?.[key];
    const soundUrl =
      customSoundUrl ||
      (soundConfig?.soundUrl === "" || !soundConfig?.soundUrl
        ? DEFAULT_SOUND_URLS[key]
        : soundConfig.soundUrl);

    if (!soundUrl) {
      return;
    }

    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
    }

    const effectiveVolume =
      masterVolume === 0 || categoryVolume === 0
        ? 1.0
        : categoryVolume * masterVolume;

    const audio = new Audio(soundUrl);
    audio.volume = effectiveVolume;
    testAudioRef.current = audio;

    audio.play().catch(() => {});

    audio.onended = () => {
      if (testAudioRef.current === audio) {
        testAudioRef.current = null;
      }
    };
  };

  return { playSound, playSoundTest };
};
