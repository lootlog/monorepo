import { reportSettingsSave } from "@/lib/settings-persistence/settings-save-status.store";
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
