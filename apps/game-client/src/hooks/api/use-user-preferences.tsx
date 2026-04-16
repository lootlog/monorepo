import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import {
  cloneNotificationMutes,
  getUpdateUserPreferencesMutationKey,
  getUserPreferencesQueryKey,
} from "@/lib/user-preferences";
import type { UpdateUserPreferencesPayload, UserPreferences } from "@lootlog/types";

export const useUserPreferences = (enabled = true) => {
  const { client } = useAuthenticatedApiClient();

  return useQuery({
    queryKey: getUserPreferencesQueryKey(),
    queryFn: async () => {
      const response = await client.get<UserPreferences>(
        `${API_URL}/users/@me/preferences`,
      );

      return response.data;
    },
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useUpdateUserPreferences = () => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getUpdateUserPreferencesMutationKey(),
    mutationFn: async (payload: UpdateUserPreferencesPayload) => {
      const response = await client.patch<UserPreferences>(
        `${API_URL}/users/@me/preferences`,
        payload,
      );

      return response.data;
    },
    onMutate: async (payload) => {
      const queryKey = getUserPreferencesQueryKey();
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<UserPreferences>(queryKey);

      if (!previousData) {
        return { previousData };
      }

      const nextMutes = payload.mutes
        ? {
            players: payload.mutes.players
              ? payload.mutes.players.map((player) => ({ ...player }))
              : cloneNotificationMutes(previousData.mutes).players,
            npcs: payload.mutes.npcs
              ? payload.mutes.npcs.map((npc) => ({ ...npc }))
              : cloneNotificationMutes(previousData.mutes).npcs,
          }
        : previousData.mutes;

      queryClient.setQueryData<UserPreferences>(queryKey, {
        ...previousData,
        ...payload,
        mutes: nextMutes,
      });

      return { previousData };
    },
    onError: (_error, _payload, context) => {
      if (!context?.previousData) {
        return;
      }

      queryClient.setQueryData(getUserPreferencesQueryKey(), context.previousData);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(getUserPreferencesQueryKey(), data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getUserPreferencesQueryKey(),
      });
    },
  });
};
