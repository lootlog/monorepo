import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LootlogCharacterConfigResponse } from "@/hooks/api/use-lootlog-character-config";
import { Game } from "@/lib/game";

export type UseUpdateLootlogCharacterSettings = {
  characterId: string;
  lootGuildIds: string[];
  timerGuildIds: string[];
};

export const useUpdateLootlogCharactersConfig = () => {
  const { client } = useAuthenticatedApiClient();
  const accountId = String(Game.hero.account);
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

      const previousData = queryClient.getQueryData<{
        data: LootlogCharacterConfigResponse;
      }>(["lootlog-characters-config", accountId]);

      if (previousData?.data) {
        const newData = {
          ...previousData,
          data: {
            ...previousData.data,
            [variables.characterId]: {
              ...previousData.data[variables.characterId],
              collectLootWhitelistGuildIds: variables.lootGuildIds,
              addTimersWhitelistGuildIds: variables.timerGuildIds,
            },
          },
        };

        queryClient.setQueryData(
          ["lootlog-characters-config", accountId],
          newData,
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
