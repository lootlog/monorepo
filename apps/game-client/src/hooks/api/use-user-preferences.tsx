import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cloneNotificationMutes } from "@/lib/user-preferences";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
} from "@lootlog/api-client/react-query/main/users";
import type { UpdateUserPreferencesDto } from "@lootlog/api-client/models/main/update-user-preferences-dto";
import type { UserPreferencesResponseDtoOutput } from "@lootlog/api-client/models/main/user-preferences-response-dto-output";

export const useUserPreferences = (enabled = true) => {
  return useUsersControllerGetUserPreferences({
    query: {
      queryKey: getUsersControllerGetUserPreferencesQueryKey(),
      enabled,
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  const queryKey = getUsersControllerGetUserPreferencesQueryKey();

  return useMutation({
    mutationKey: ["usersControllerUpdateUserPreferences"],
    mutationFn: (payload: UpdateUserPreferencesDto) =>
      usersControllerUpdateUserPreferences(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(queryKey);

      if (!previousData) {
        return { previousData };
      }

      const previousMutes = cloneNotificationMutes(previousData.mutes);
      const nextMutes = payload.mutes
        ? {
            players: payload.mutes.players
              ? payload.mutes.players.map((player) => ({ ...player }))
              : previousMutes.players,
            npcs: payload.mutes.npcs
              ? payload.mutes.npcs.map((npc) => ({ ...npc }))
              : previousMutes.npcs,
          }
        : previousData.mutes;

      queryClient.setQueryData<UserPreferencesResponseDtoOutput>(queryKey, {
        ...previousData,
        ...payload,
        chatAppearance: payload.chatAppearance
          ? {
              ...previousData.chatAppearance,
              ...payload.chatAppearance,
            }
          : previousData.chatAppearance,
        mutes: nextMutes,
      });

      return { previousData };
    },
    onError: (_error, _payload, context) => {
      if (!context?.previousData) {
        return;
      }

      queryClient.setQueryData(queryKey, context.previousData);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
};
