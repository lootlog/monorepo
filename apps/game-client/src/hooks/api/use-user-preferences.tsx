import { useMutation, useQueryClient } from "@tanstack/react-query";
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

      const { mutes: _mutes, ...personalPayload } = payload;

      queryClient.setQueryData<UserPreferencesResponseDtoOutput>(queryKey, {
        ...previousData,
        ...personalPayload,
        chatAppearance: payload.chatAppearance
          ? {
              ...previousData.chatAppearance,
              ...payload.chatAppearance,
            }
          : previousData.chatAppearance,
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
