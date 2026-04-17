import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSoundSettings, updateSoundSettings } from "@/api";
import type {
  UserSoundSettings,
  UpdateSoundSettingsPayload,
} from "@lootlog/types";

const SOUND_SETTINGS_QUERY_KEY = ["sound-settings"];

export const useSoundSettings = (enabled = true) => {
  const query = useQuery({
    queryKey: SOUND_SETTINGS_QUERY_KEY,
    queryFn: () => fetchSoundSettings(),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  });

  return query;
};

export const useUpdateSoundSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSoundSettingsPayload) =>
      updateSoundSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: SOUND_SETTINGS_QUERY_KEY });

      const previousSettings = queryClient.getQueryData<UserSoundSettings>(
        SOUND_SETTINGS_QUERY_KEY,
      );

      queryClient.setQueryData<UserSoundSettings>(
        SOUND_SETTINGS_QUERY_KEY,
        (old) => {
          if (!old) return old;

          const newData = { ...old };

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
            newData.notificationsConfig = { ...old.notificationsConfig };
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
            newData.detectorConfig = { ...old.detectorConfig };
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
            newData.timersConfig = { ...old.timersConfig };
            Object.entries(payload.timersConfig).forEach(
              ([key, partialConfig]) => {
                newData.timersConfig[key] = {
                  ...newData.timersConfig[key],
                  ...partialConfig,
                };
              },
            );
          }

          return newData;
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
