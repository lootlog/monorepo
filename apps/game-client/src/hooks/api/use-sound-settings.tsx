import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { API_URL } from "@/config/api";
import type {
  UserSoundSettings,
  UpdateSoundSettingsPayload,
} from "@lootlog/types";

const SOUND_SETTINGS_QUERY_KEY = ["sound-settings"];

export const useSoundSettings = (enabled = true) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: SOUND_SETTINGS_QUERY_KEY,
    queryFn: () => client.get<UserSoundSettings>(`${API_URL}/sound-settings`),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  });

  return query;
};

export const useUpdateSoundSettings = () => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSoundSettingsPayload) =>
      client.patch<UserSoundSettings>(`${API_URL}/sound-settings`, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: SOUND_SETTINGS_QUERY_KEY });

      const previousSettings = queryClient.getQueryData<{
        data: UserSoundSettings;
      }>(SOUND_SETTINGS_QUERY_KEY);

      queryClient.setQueryData<{ data: UserSoundSettings }>(
        SOUND_SETTINGS_QUERY_KEY,
        (old) => {
          if (!old) return old;

          const newData = { ...old.data };

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
            newData.notificationsConfig = { ...old.data.notificationsConfig };
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
            newData.detectorConfig = { ...old.data.detectorConfig };
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
            newData.timersConfig = { ...old.data.timersConfig };
            Object.entries(payload.timersConfig).forEach(
              ([key, partialConfig]) => {
                newData.timersConfig[key] = {
                  ...newData.timersConfig[key],
                  ...partialConfig,
                };
              },
            );
          }

          return { ...old, data: newData };
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
