import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { NpcType } from "@/hooks/api/game-data/use-npcs";
import { ItemRarity } from "@/hooks/api/loots/use-loots";

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
    queryKey: ["guild-lootlog-config", guildId],
    queryFn: () =>
      client.get<LootlogConfig>(`/guilds/${guildId}/lootlog-config`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
