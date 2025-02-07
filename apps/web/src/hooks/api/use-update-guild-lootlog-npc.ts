import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "hooks/api/use-api-client";
import { ItemRarity } from "hooks/api/use-loots";
import { useGuildId } from "hooks/use-guild-id";

type UpdateGuildLootlogNpcOptions = {
  npcId: number;
  allowedRarities: ItemRarity[];
};

type UpdateGuildLootlogNpcResponse = unknown;

export const useUpdateGuildLootlogNpc = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  const mutation = useMutation<
    UpdateGuildLootlogNpcResponse,
    unknown,
    UpdateGuildLootlogNpcOptions
  >({
    mutationFn: async ({ allowedRarities, npcId }) => {
      return client.put(`/guilds/${guildId}/lootlog-config/${npcId}`, {
        allowedRarities,
      });
    },
    mutationKey: ["update-guild-lootlog-npc"],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["guild-lootlog-config", guildId],
      });
    },
  });

  return mutation;
};
