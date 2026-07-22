import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSoundSettingsControllerGetSettingsQueryKey,
  useSoundSettingsControllerGetSettings,
  soundSettingsControllerUpdateSettings,
} from "@/lib/api/generated/main/sound-settings/sound-settings";
import type {
  SoundSettingsResponseDto,
  UpdateSoundSettingsDto,
} from "@/lib/api/generated/main/model";
import { normalizeSoundSettings } from "@/lib/api/generated-helpers";

const SOUND_SETTINGS_QUERY_KEY =
  getSoundSettingsControllerGetSettingsQueryKey();

export const useSoundSettings = (enabled = true) => {
  return useSoundSettingsControllerGetSettings({
    query: {
      queryKey: SOUND_SETTINGS_QUERY_KEY,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
      enabled,
    },
  });
};

export const useUpdateSoundSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    scope: { id: "sound-settings" },
    mutationFn: (payload: UpdateSoundSettingsDto) =>
      soundSettingsControllerUpdateSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: SOUND_SETTINGS_QUERY_KEY });

      const previousSettings =
        queryClient.getQueryData<SoundSettingsResponseDto>(
          SOUND_SETTINGS_QUERY_KEY,
        );

      queryClient.setQueryData<SoundSettingsResponseDto>(
        SOUND_SETTINGS_QUERY_KEY,
        (old) => {
          if (!old) return old;

          const newData = normalizeSoundSettings(old);

          if (payload.masterVolume !== undefined) {
            newData.masterVolume = payload.masterVolume;
          }
          if (payload.notificationsVolume !== undefined) {
            newData.notificationsVolume = payload.notificationsVolume;
          }
          if (payload.detectorVolume !== undefined) {
            newData.detectorVolume = payload.detectorVolume;
          }
          if (payload.timersVolume !== undefined) {
            newData.timersVolume = payload.timersVolume;
          }

          if (payload.notificationsConfig) {
            newData.notificationsConfig = { ...newData.notificationsConfig };
            Object.entries(payload.notificationsConfig).forEach(
              ([key, partialConfig]) => {
                newData.notificationsConfig[key] = {
                  ...newData.notificationsConfig[key],
                  ...partialConfig,
                };
              },
            );
          }
          if (payload.detectorConfig) {
            newData.detectorConfig = { ...newData.detectorConfig };
            Object.entries(payload.detectorConfig).forEach(
              ([key, partialConfig]) => {
                newData.detectorConfig[key] = {
                  ...newData.detectorConfig[key],
                  ...partialConfig,
                };
              },
            );
          }
          if (payload.timersConfig) {
            newData.timersConfig = { ...newData.timersConfig };
            Object.entries(payload.timersConfig).forEach(
              ([key, partialConfig]) => {
                newData.timersConfig[key] = {
                  ...newData.timersConfig[key],
                  ...partialConfig,
                };
              },
            );
          }

          return newData as unknown as SoundSettingsResponseDto;
        },
      );

      return { previousSettings };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          SOUND_SETTINGS_QUERY_KEY,
          context.previousSettings,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SOUND_SETTINGS_QUERY_KEY });
    },
  });
};
