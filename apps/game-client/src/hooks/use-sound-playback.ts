import { useEffect } from "react";
import { useSoundSettings } from "@/hooks/api/use-sound-settings";
import { DEFAULT_SOUND_URLS } from "@/features/settings/config/default-sounds";
import { useQueryClient } from "@tanstack/react-query";
import type { UserSoundSettings } from "@lootlog/types";
import { normalizeSoundSettings } from "@/lib/api/generated-helpers";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@/lib/api/generated/main/sound-settings/sound-settings";
import type { SoundSettingsResponseDto } from "@/lib/api/generated/main/model";
import {
  acquireSoundPlayback,
  playSoundRequest,
  preloadSoundUrl,
} from "@/lib/shared-audio-playback";

type SoundCategory = "notifications" | "detector" | "timers" | "pings";
type ConfigurableSoundCategory = Exclude<SoundCategory, "pings">;

const SOUND_SETTINGS_QUERY_KEY =
  getSoundSettingsControllerGetSettingsQueryKey();
let hasAudioInteraction = navigator.userActivation?.hasBeenActive ?? false;

const getSoundUrl = (
  settings: UserSoundSettings,
  category: SoundCategory,
  key: string,
) => {
  const soundConfig =
    category === "pings"
      ? undefined
      : settings[`${category as ConfigurableSoundCategory}Config`]?.[key];

  if (soundConfig?.soundUrl) {
    return soundConfig.soundUrl;
  }

  return DEFAULT_SOUND_URLS[key];
};

export const useSoundPlayback = () => {
  const { data: soundSettingsData } = useSoundSettings();
  const queryClient = useQueryClient();
  const soundSettings = soundSettingsData
    ? normalizeSoundSettings(soundSettingsData)
    : undefined;

  useEffect(() => acquireSoundPlayback(), []);

  useEffect(() => {
    if (!soundSettings || soundSettings.masterVolume === 0) {
      return;
    }

    const preloadConfiguredSounds = () => {
      const configurableCategories: ConfigurableSoundCategory[] = [
        "notifications",
        "detector",
        "timers",
      ];
      for (const category of configurableCategories) {
        if (soundSettings[`${category}Volume`] === 0) {
          continue;
        }

        const categoryConfig = soundSettings[`${category}Config`];
        for (const key of Object.keys(categoryConfig)) {
          const soundUrl = getSoundUrl(soundSettings, category, key);
          if (soundUrl) {
            preloadSoundUrl(soundUrl);
          }
        }
      }

      if (soundSettings.pingsVolume > 0 && DEFAULT_SOUND_URLS.mapPing) {
        preloadSoundUrl(DEFAULT_SOUND_URLS.mapPing);
      }
    };

    if (hasAudioInteraction || navigator.userActivation?.hasBeenActive) {
      hasAudioInteraction = true;
      preloadConfiguredSounds();
      return;
    }

    const handleFirstInteraction = () => {
      hasAudioInteraction = true;
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("pointerdown", handleFirstInteraction);
      preloadConfiguredSounds();
    };

    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    window.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("pointerdown", handleFirstInteraction);
    };
  }, [soundSettings]);

  const getLatestSettings = (): UserSoundSettings | undefined => {
    const cached = queryClient.getQueryData<SoundSettingsResponseDto>(
      SOUND_SETTINGS_QUERY_KEY,
    );

    if (cached) {
      return normalizeSoundSettings(cached);
    }

    return soundSettings;
  };

  const playSounds = (category: SoundCategory, keys: Iterable<string>) => {
    const settings = getLatestSettings();
    if (!settings) {
      return;
    }

    const categoryVolume = settings[`${category}Volume`];
    const masterVolume = settings.masterVolume;

    if (masterVolume === 0 || categoryVolume === 0) {
      return;
    }

    const resolvedSoundUrls = new Set<string>();
    for (const key of keys) {
      const soundUrl = getSoundUrl(settings, category, key);

      if (soundUrl) {
        resolvedSoundUrls.add(soundUrl);
      }
    }

    for (const soundUrl of resolvedSoundUrls) {
      playSoundRequest({
        url: soundUrl,
        volume: categoryVolume * masterVolume,
      });
    }
  };

  const playSound = (category: SoundCategory, key: string) => {
    playSounds(category, [key]);
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

    const soundUrl = customSoundUrl || getSoundUrl(settings, category, key);

    if (!soundUrl) {
      return;
    }

    const effectiveVolume =
      masterVolume === 0 || categoryVolume === 0
        ? 1.0
        : categoryVolume * masterVolume;

    playSoundRequest({
      channel: "preview",
      url: soundUrl,
      volume: effectiveVolume,
    });
  };

  return { playSound, playSounds, playSoundTest };
};
