import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
  type UpdateUserPreferencesDto,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";

export const useUserPreferences = () =>
  useUsersControllerGetUserPreferences({
    query: {
      refetchOnWindowFocus: true,
      retry: false,
      staleTime: 60_000,
    },
  });

type UserPreferencesUpdater = (
  current: UserPreferencesResponseDtoOutput | undefined,
) => UpdateUserPreferencesDto;

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  const queryKey = getUsersControllerGetUserPreferencesQueryKey();

  const mutation = useMutation({
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

  const mutateFromCurrent = (
    updater: UserPreferencesUpdater,
    options?: Parameters<typeof mutation.mutate>[1],
  ) =>
    mutation.mutate(
      updater(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(queryKey),
      ),
      options,
    );

  return { ...mutation, mutateFromCurrent };
};
