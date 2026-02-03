import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Loot } from "@/hooks/api/loots/use-loots";

export type UseLootOptions = {
  lootId: number | null;
  enabled?: boolean;
};

export const useLoot = ({ lootId, enabled = true }: UseLootOptions) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: ["loot", guildId, lootId],
    queryFn: async () => {
      const response = await client.get<Loot>(
        `/guilds/${guildId}/loots/${lootId}`,
      );
      return response.data;
    },
    enabled: enabled && !!guildId && !!lootId,
    staleTime: 60 * 1000,
  });
};
