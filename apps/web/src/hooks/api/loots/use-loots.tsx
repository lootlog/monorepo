import { useInfiniteQuery } from "@tanstack/react-query";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { stringify } from "qs";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import type { Player } from "@/hooks/api/game-data/use-guild-players";
import { useLootsFilters } from "@/hooks/use-loots-filters";

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
};

export type UseLootsResponse = Loot[];

export type UseLootsErrorResponse = {
  message: string;
};

export const useLoots = ({ limit = DEFAULT_PAGE_LIMIT }: UseLootsOptions) => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const { world } = useGuildContext();
  const { filters } = useLootsFilters();

  const queryParams = {
    limit,
    npcs: filters.npcs.length > 0 ? filters.npcs : undefined,
    npcTypes: filters.npcTypes.length > 0 ? filters.npcTypes : undefined,
    rarities: filters.rarities.length > 0 ? filters.rarities : undefined,
    players: filters.players.length > 0 ? filters.players : undefined,
    npcLevelMin: filters.npcLevelMin || undefined,
    npcLevelMax: filters.npcLevelMax || undefined,
    itemLevelMin: filters.itemLevelMin || undefined,
    itemLevelMax: filters.itemLevelMax || undefined,
    playerLevelMin: filters.playerLevelMin || undefined,
    playerLevelMax: filters.playerLevelMax || undefined,
    search: filters.search || undefined,
    hid: filters.hid || undefined,
    itemNames: filters.itemNames.length > 0 ? filters.itemNames : undefined,
    world,
  };

  const queryString = stringify(queryParams, {
    arrayFormat: "comma",
    allowEmptyArrays: false,
    filter: (_, value) => {
      if (value === "" || value === undefined || value === null) {
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
    meta: { persist: false },
  });

  return query;
};
