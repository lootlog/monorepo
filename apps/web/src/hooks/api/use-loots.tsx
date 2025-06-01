import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { GuildMember } from "hooks/api/use-guild-members";
import { Player } from "hooks/api/use-guild-players";
import { Npc } from "hooks/api/use-npcs";
import { DEFAULT_PAGE_LIMIT } from "constants/pagination";
import { parse, stringify } from "qs";
import { useGuildId } from "hooks/use-guild-id";
import { useGuildContext } from "hooks/use-guild-context";
import { useApiClient } from "hooks/api/use-api-client";

export enum ItemRarity {
  COMMON = "COMMON",
  UPGRADED = "UPGRADED",
  UNIQUE = "UNIQUE",
  HEROIC = "HEROIC",
  LEGENDARY = "LEGENDARY",
}

export enum LootSource {
  FIGHT = "FIGHT",
  DIALOG = "DIALOG",
  LOOTBOX = "LOOTBOX",
}

export type Item = {
  id: number;
  hid: string;
  name: string;
  icon: string;
  pr: number;
  prc: string;
  stat: string;
  type: string;
  rarity: ItemRarity;
  lvl: number;
  prof: string[];
};

export type Loot = {
  id: number;
  guildId: string;
  world: string;
  source: LootSource;
  location: string;
  diedPlayers: number[];
  createdAt: string;
  updatedAt: string;
  npcs: Npc[];
  players: Player[];
  items: Item[];
  member: GuildMember;
};

export type UseLootsOptions = {
  limit?: number;
  npcs?: string[];
  npcTypes?: string[];
  rarities?: string[];
  players?: number[];
};

export type UseLootsResponse = Loot[];

export type UseLootsErrorResponse = {
  message: string;
};

export const useLoots = ({ limit = DEFAULT_PAGE_LIMIT }: UseLootsOptions) => {
  const guildId = useGuildId();
  const { client, isAuthenticated } = useApiClient();
  const [searchParams] = useSearchParams();
  const { world } = useGuildContext();

  const { npcs, npcTypes, rarities, players } = parse(searchParams.toString(), {
    ignoreQueryPrefix: true,
  });

  const queryParams = {
    limit,
    npcs,
    npcTypes,
    rarities,
    players,
    world,
  };

  const queryString = stringify(queryParams, {
    arrayFormat: "comma",
    allowEmptyArrays: false,
    filter: (_, value) => {
      if (value === "") {
        return;
      }

      return value;
    },
  });

  const query = useInfiniteQuery({
    queryKey: ["loots", guildId, queryString],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam ? `&cursor=${pageParam}` : "";

      return client.get<UseLootsResponse>(
        `/guilds/${guildId}/loots?${queryString}${cursor}`
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.data.length === limit
        ? lastPage.data[lastPage.data.length - 1]?.id
        : undefined,
    initialPageParam: 0,
    enabled: !!guildId && isAuthenticated && !!world,
  });

  return query;
};
