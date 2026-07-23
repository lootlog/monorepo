import { createApiClient } from "@lootlog/api-client/transport";
import { NpcTypeEnum as NpcType } from "@lootlog/types";

export { NpcType };

export type Npc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  type: NpcType;
  location?: string;
  margonemType: number;
};

export type NpcSearchResult = {
  npcId: number;
  name: string;
  lvl: number;
  type: NpcType;
  prof: string;
  location: string;
  wt: string | number;
  icon: string;
  latestRespBaseSeconds: number;
  latestRespawnRandomness: number;
};

export function searchNpcs(
  guildId: string,
  world: string,
  search: string,
  limit = 10,
): Promise<NpcSearchResult[]> {
  const client = createApiClient("main");
  return client.get<NpcSearchResult[]>(
    `/guilds/${guildId}/timers/npcs/search`,
    {
      params: {
        world,
        search,
        limit,
      },
    },
  );
}
