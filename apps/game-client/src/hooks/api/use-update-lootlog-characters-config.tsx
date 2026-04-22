import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Game } from "@/lib/game";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig,
} from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import type {
  CreateOrUpdateLootlogCharacterConfigDto,
  UserLootlogConfigAccountResponseDtoOutput,
} from "@/lib/api/generated/main/model";

export type UseUpdateLootlogCharacterSettings =
  CreateOrUpdateLootlogCharacterConfigDto;

export const useUpdateLootlogCharactersConfig = () => {
  const accountId = String(Game.hero.account);
  const queryClient = useQueryClient();
  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId,
    });

  return useMutation({
    mutationKey: [
      "userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
    ],
    mutationFn: (options: CreateOrUpdateLootlogCharacterConfigDto) =>
      userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig(
        { accountId },
        options,
      ),
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
