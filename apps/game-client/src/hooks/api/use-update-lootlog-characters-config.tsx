import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { useGlobalStore } from "@/store/global.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LootlogCharacterConfigResponse } from "@/hooks/api/use-lootlog-character-config";

export type UseUpdateLootlogCharacterSettings = {
  characterId: string;
  lootGuildIds: string[];
  timerGuildIds: string[];
};

export const useUpdateLootlogCharactersConfig = () => {
  const { client } = useAuthenticatedApiClient();
  const accountId = useGlobalStore((state) => state.gameState.accountId);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["update-lootlog-characters-config"],
    mutationFn: (options: UseUpdateLootlogCharacterSettings) => {
      return client.put(
        `/users/@me/lootlog-config/accounts/${accountId}`,
        options,
      );
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ["lootlog-characters-config", accountId],
      });

      const previousData =
        queryClient.getQueryData<LootlogCharacterConfigResponse>([
          "lootlog-characters-config",
          accountId,
        ]);

      if (previousData) {
        queryClient.setQueryData<LootlogCharacterConfigResponse>(
          ["lootlog-characters-config", accountId],
          {
            ...previousData,
            [variables.characterId]: {
              ...previousData[variables.characterId],
              collectLootWhitelistGuildIds: variables.lootGuildIds,
              addTimersWhitelistGuildIds: variables.timerGuildIds,
            },
          },
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["lootlog-characters-config", accountId],
          context.previousData,
        );
      }
    },
  });

  return mutation;
};
