import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { NpcType } from "@/hooks/api/game-data/use-npcs";
import type { ItemRarity } from "@/hooks/api/loots/use-loots";
import { queryKeys } from "@/lib/query-keys";

export type LootlogConfigNpc = {
  id: number;
  npcType: NpcType;
  allowedRarities: ItemRarity[];
};

export type LootlogConfig = {
  id: string;
  guildId: string;
  type: string;
  name: string;
  npcs: LootlogConfigNpc[];
};

export const useGuildLootlogConfig = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: queryKeys.guilds.lootlogConfig(guildId),
    queryFn: () =>
      client.get<LootlogConfig>(`/guilds/${guildId}/lootlog-config`),
    enabled: !!guildId,
  });

  return query;
};
