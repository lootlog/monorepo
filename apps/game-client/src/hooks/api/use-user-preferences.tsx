import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";
import {
  useMutation,
  useQueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  usersControllerUpdateUserPreferences,
  type UpdateUserPreferencesDto,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";

const MUTATION_KEY = ["usersControllerUpdateUserPreferences"];

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

/**
 * Builds a payload from the preferences as they are in the cache right now,
 * optimistic updates included. List fields (hidden guilds, order) must be
 * derived this way: a value read during render can predate a click that has
 * already been applied, and would silently undo it.
 */
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

      // The optimistic value lands before anything is awaited, so the next
      // click in the same tick already derives from it.
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

      // A queued update was derived from this one's optimistic state and will
      // re-send it, so the cache keeps that state instead of rolling back.
      if (!context?.previousData || hasLaterUpdates()) {
        return;
      }

      queryClient.setQueryData(queryKey, context.previousData);
    },
    // The response is the full preferences document, so no refetch follows.
    // While later updates are queued, the response predates their optimistic
    // state and must not replace it; the last response wins.
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
