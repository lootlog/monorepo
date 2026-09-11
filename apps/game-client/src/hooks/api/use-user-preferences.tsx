import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";
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

  const mutation = useMutation({
    mutationKey: ["usersControllerUpdateUserPreferences"],
    scope: { id: "user-preferences" },
    mutationFn: (payload: UpdateUserPreferencesDto) =>
      usersControllerUpdateUserPreferences(payload),
    onMutate: async (payload) => {
      reportSettingsSave.saving();
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
    onError: (_error, payload, context) => {
      reportSettingsSave.failed(() => mutation.mutate(payload));

      if (!context?.previousData) {
        return;
      }

      queryClient.setQueryData(queryKey, context.previousData);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      reportSettingsSave.saved();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return mutation;
};
