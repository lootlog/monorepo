import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cloneNotificationMutes } from "@/lib/user-preferences";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
} from "@/lib/api/generated/main/users/users";
import type {
  UpdateUserPreferencesDto,
  UserPreferencesResponseDtoOutput,
} from "@/lib/api/generated/main/model";

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
