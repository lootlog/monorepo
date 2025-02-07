import { useQuery } from "@tanstack/react-query";
import { NpcType } from "hooks/api/use-npcs";
import { ItemRarity } from "hooks/api/use-loots";
import { useGuildId } from "hooks/use-guild-id";
import { useApiClient } from "hooks/api/use-api-client";

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
  const { client, isAuthenticated } = useApiClient();

  const query = useQuery({
    queryKey: ["guild-lootlog-config", guildId],
    queryFn: () =>
      client.get<LootlogConfig>(`/guilds/${guildId}/lootlog-config`),
    enabled: isAuthenticated && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
