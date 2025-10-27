import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { stringify } from "qs";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import type { Player } from "@/hooks/api/game-data/use-guild-players";

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
  lootShare: Record<string, string[]>;
  commentsCount: number;
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
  const { client } = useApiClient();
  const searchParams = useSearch({ strict: false }) as Record<string, unknown>;
  const { world } = useGuildContext();

  const { npcs, npcTypes, rarities, players } = searchParams;

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
        `/guilds/${guildId}/loots?${queryString}${cursor}`,
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.data.length === limit
        ? lastPage.data[lastPage.data.length - 1]?.id
        : undefined,
    initialPageParam: 0,
    enabled: !!guildId && !!world,
    refetchOnMount: "always",
    staleTime: 0,
  });

  return query;
};
