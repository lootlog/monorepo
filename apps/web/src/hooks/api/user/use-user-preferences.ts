import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
} from "@lootlog/api-client/react-query/main/users";
import type { UpdateUserPreferencesDto } from "@lootlog/api-client/models/main/update-user-preferences-dto";
import type { UserPreferencesResponseDtoOutput } from "@lootlog/api-client/models/main/user-preferences-response-dto-output";

export const useUserPreferences = () =>
  useUsersControllerGetUserPreferences({
    query: {
      queryKey: getUsersControllerGetUserPreferencesQueryKey(),
      refetchOnWindowFocus: true,
      retry: false,
      staleTime: 60_000,
    },
  });

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

      if (previousData) {
        queryClient.setQueryData<UserPreferencesResponseDtoOutput>(queryKey, {
          ...previousData,
          ...payload,
          chatAppearance: payload.chatAppearance
            ? {
                ...previousData.chatAppearance,
                ...payload.chatAppearance,
              }
            : previousData.chatAppearance,
          mutes: payload.mutes
            ? {
                players: payload.mutes.players ?? previousData.mutes.players,
                npcs: payload.mutes.npcs ?? previousData.mutes.npcs,
              }
            : previousData.mutes,
        });
      }

      return { previousData };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};
