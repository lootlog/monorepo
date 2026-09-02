import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cloneNotificationMutes } from "@/lib/user-preferences";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
  type UpdateUserPreferencesDto,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";

export const useUserPreferences = (enabled = true) => {
  return useUsersControllerGetUserPreferences({
    query: {
      queryKey: getUsersControllerGetUserPreferencesQueryKey(),
      enabled,
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: true,
      retry: false,
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  const queryKey = getUsersControllerGetUserPreferencesQueryKey();

  return useMutation({
    mutationKey: ["usersControllerUpdateUserPreferences"],
    scope: { id: "user-preferences" },
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
