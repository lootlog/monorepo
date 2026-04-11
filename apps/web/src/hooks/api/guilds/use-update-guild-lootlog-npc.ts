import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { ItemRarity } from "@/hooks/api/loots/use-loots";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { mutationKeys, queryKeys } from "@/lib/query-keys";

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
    mutationFn: ({ allowedRarities, npcId }) => {
      return client.put(`/guilds/${guildId}/lootlog-config/${npcId}`, {
        allowedRarities,
      });
    },
    mutationKey: mutationKeys.guilds.updateLootlogNpc(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.guilds.lootlogConfig(guildId),
      });
    },
  });

  return mutation;
};
