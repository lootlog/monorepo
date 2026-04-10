import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Loot } from "@/hooks/api/loots/use-loots";
import { queryKeys } from "@/lib/query-keys";

export type UseLootOptions = {
  lootId: number | null;
  enabled?: boolean;
};

export const useLoot = ({ lootId, enabled = true }: UseLootOptions) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: queryKeys.loots.detail(guildId, lootId),
    queryFn: async () => {
      const response = await client.get<Loot>(
        `/guilds/${guildId}/loots/${lootId}`,
      );
      return response;
    },
    enabled: enabled && !!guildId && !!lootId,
    staleTime: 60 * 1000,
  });
};
