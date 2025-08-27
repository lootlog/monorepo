import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type DeleteLootOptions = {
  lootId: number;
};

export const useDeleteLoot = () => {
  const { client } = useApiClient();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lootId }: DeleteLootOptions) =>
      client.delete(`/guilds/${guildId}/loots/${lootId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["loots", guildId],
      });
    },
  });
};
