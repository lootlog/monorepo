import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/store/game.store";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig,
  type CreateOrUpdateLootlogCharacterConfigDto,
  type UserLootlogConfigAccountResponseDtoOutput,
} from "@lootlog/client/main";

export type UseUpdateLootlogCharacterSettings =
  CreateOrUpdateLootlogCharacterConfigDto;

export const useUpdateLootlogCharactersConfig = () => {
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? null);
  const queryClient = useQueryClient();

  const queryKey = accountId
    ? getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
        accountId,
      })
    : ["user-lootlog-config", "unavailable"];

  const mutation = useMutation({
    mutationKey: [
      "userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
    ],
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
    // one instead of triggering a refetch of the whole account map.
    onSuccess: (data) => {
      queryClient.setQueryData<UserLootlogConfigAccountResponseDtoOutput>(
        queryKey,
        (current) => ({ ...current, [data.characterId]: data }),
      );
      reportSettingsSave.saved();
    },
    onMutate: async (variables) => {
      reportSettingsSave.saving();
      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<UserLootlogConfigAccountResponseDtoOutput>(
          queryKey,
        );

      if (previousData) {
        const newData = {
          ...previousData,
          [variables.characterId]: {
            ...previousData[variables.characterId],
            catchingGuildIds: variables.catchingGuildIds,
          },
        };

        queryClient.setQueryData(queryKey, newData);
      }

      return { previousData };
    },
    onError: (_err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      reportSettingsSave.failed(() => mutation.mutate(variables));
    },
  });

  return mutation;
};
