import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { parseItemHid } from "@/lib/utils/hid-detection";
import type { Loot } from "@/hooks/api/loots/use-loots";
import { queryKeys } from "@/lib/query-keys";

export const useItemByHid = (input: string, enabled: boolean) => {
  const { client } = useApiClient();
  const guildId = useGuildId();

  const parsed = parseItemHid(input);

  return useQuery({
    queryKey: queryKeys.gameData.itemByHid(parsed?.hid, parsed?.world, guildId),
    queryFn: async () => {
      if (!parsed) return null;

      const response = await client.get<Loot[]>(
        `/guilds/${guildId}/loots?hid=${parsed.hid}&world=${parsed.world}&limit=1`,
      );

      const loot = response[0];
      if (!loot) return null;

      const item = loot.items.find((i) => i.hid === parsed.hid);
      return item || null;
    },
    enabled: enabled && !!parsed && !!guildId,
    staleTime: 5 * 60 * 1000,
  });
};
