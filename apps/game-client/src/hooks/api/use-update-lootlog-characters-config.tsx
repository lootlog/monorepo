import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/store/game.store";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig,
  type CreateOrUpdateLootlogCharacterConfigDto,
  type UserLootlogConfigAccountResponseDtoOutput,
} from "@lootlog/client/main";

export const LOOTLOG_CHARACTERS_CONFIG_MUTATION_KEY = [
  "userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
];

/**
 * Builds a character entry from the account map as it is in the cache right
 * now, optimistic updates included, so a toggle derived from it never undoes
 * a click that is still saving.
 */
export type LootlogCharacterConfigUpdater = (
  current: UserLootlogConfigAccountResponseDtoOutput | undefined,
) => CreateOrUpdateLootlogCharacterConfigDto;

export const useUpdateLootlogCharactersConfig = () => {
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? null);
  const queryClient = useQueryClient();

  const queryKey = accountId
    ? getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
        accountId,
      })
    : ["user-lootlog-config", "unavailable"];

  const hasLaterUpdates = () =>
    queryClient.isMutating({
      mutationKey: LOOTLOG_CHARACTERS_CONFIG_MUTATION_KEY,
    }) > 1;

  const mutation = useMutation({
    mutationKey: LOOTLOG_CHARACTERS_CONFIG_MUTATION_KEY,
    // Writes for one account go out in order, so the last click wins.
    scope: { id: "lootlog-characters-config" },
    mutationFn: (options: CreateOrUpdateLootlogCharacterConfigDto) => {
      if (!accountId) {
        throw new Error("Canonical game identity is unavailable");
      }

      return userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig(
        { accountId },
        options,
      );
    },
    // The response is the saved character entry; it replaces the optimistic
    // one instead of triggering a refetch of the whole account map. While a
    // later write is queued, the response predates its optimistic state.
    onSuccess: (data) => {
      if (!hasLaterUpdates()) {
        queryClient.setQueryData<UserLootlogConfigAccountResponseDtoOutput>(
          queryKey,
          (current) => ({ ...current, [data.characterId]: data }),
        );
      }

      reportSettingsSave.saved();
    },
    onMutate: async (variables) => {
      reportSettingsSave.saving();

      const previousData =
        queryClient.getQueryData<UserLootlogConfigAccountResponseDtoOutput>(
          queryKey,
        );

      // Applied before anything is awaited, so the next click in the same
      // tick already derives from this one.
      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          [variables.characterId]: {
            ...previousData[variables.characterId],
            catchingGuildIds: variables.catchingGuildIds,
          },
        });
      }

      await queryClient.cancelQueries({ queryKey });

      return { previousData };
    },
    // The snapshot may hold an earlier write's optimistic state that also
    // failed, so it goes back as outdated rather than confirmed, and a
    // refetch replaces it.
    onError: (_err, variables, context) => {
      if (!hasLaterUpdates()) {
        if (context?.previousData)
          queryClient.setQueryData(queryKey, context.previousData, {
            updatedAt: 0,
          });

        void queryClient.invalidateQueries({ queryKey });
      }

      reportSettingsSave.failed(() => mutation.mutate(variables));
    },
  });

  const mutateFromCurrent = (updater: LootlogCharacterConfigUpdater) =>
    mutation.mutate(
      updater(
        queryClient.getQueryData<UserLootlogConfigAccountResponseDtoOutput>(
          queryKey,
        ),
      ),
    );

  return { ...mutation, mutateFromCurrent };
};
