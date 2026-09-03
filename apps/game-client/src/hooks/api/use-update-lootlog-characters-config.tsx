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

  return useMutation({
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
    onMutate: async (variables) => {
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
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  });
};
