import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateLootlogCharactersConfig,
  type LootlogCharacterConfigResponse,
  type UpdateLootlogCharacterSettings,
} from "@/api";
import { Game } from "@/lib/game";

export type UseUpdateLootlogCharacterSettings = UpdateLootlogCharacterSettings;

export const useUpdateLootlogCharactersConfig = () => {
  const accountId = String(Game.hero.account);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["update-lootlog-characters-config"],
    mutationFn: (options: UpdateLootlogCharacterSettings) =>
      updateLootlogCharactersConfig(accountId, options),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["lootlog-characters-config", accountId],
      });
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
        const newData = {
          ...previousData,
          [variables.characterId]: {
            ...previousData[variables.characterId],
            catchingGuildIds: variables.catchingGuildIds,
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
