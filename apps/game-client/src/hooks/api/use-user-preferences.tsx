import { reportSettingsSave } from "@/lib/settings-persistence/settings-save-status.store";
import {
  useMutation,
  useQueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
  type UpdateUserPreferencesDto,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

const MUTATION_KEY = ["usersControllerUpdateUserPreferences"];

export const useUserPreferences = (enabled = true) => {
  const queryKey = getUsersControllerGetUserPreferencesQueryKey();

  return useUsersControllerGetUserPreferences({
    query: {
      queryKey,
      queryFn: async ({ signal }) =>
        (await readGameClientBootstrap("userPreferences", queryKey)) ??
        usersControllerGetUserPreferences({ signal }),
      enabled,
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });
};

export type UserPreferencesUpdater = (
  current: UserPreferencesResponseDtoOutput | undefined,
) => UpdateUserPreferencesDto;

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  const queryKey = getUsersControllerGetUserPreferencesQueryKey();

  const hasLaterUpdates = () =>
    queryClient.isMutating({ mutationKey: MUTATION_KEY }) > 1;

  const mutation = useMutation({
    mutationKey: MUTATION_KEY,
    scope: { id: "user-preferences" },
    mutationFn: (payload: UpdateUserPreferencesDto) =>
      usersControllerUpdateUserPreferences(payload),
    onMutate: async (payload) => {
      reportSettingsSave.saving();

      const previousData =
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(queryKey);

      if (previousData) {
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
      }

      await queryClient.cancelQueries({ queryKey });

      return { previousData };
    },
    onError: (_error, payload, context) => {
      reportSettingsSave.failed(() => mutation.mutate(payload));

      if (!context?.previousData || hasLaterUpdates()) {
        return;
      }

      queryClient.setQueryData(queryKey, context.previousData);
    },
    onSuccess: (data) => {
      if (!hasLaterUpdates()) {
        queryClient.setQueryData(queryKey, data);
      }

      reportSettingsSave.saved();
    },
  });

  const mutateFromCurrent = (
    updater: UserPreferencesUpdater,
    options?: MutateOptions<
      UserPreferencesResponseDtoOutput,
      Error,
      UpdateUserPreferencesDto,
      { previousData: UserPreferencesResponseDtoOutput | undefined }
    >,
  ) =>
    mutation.mutate(
      updater(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(queryKey),
      ),
      options,
    );

  return { ...mutation, mutateFromCurrent };
};
