import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { stringifyQueryParams } from "@/lib/stringify-query-params";
import type { NpcType } from "./use-guild-kill-stats";
import { queryKeys } from "@/lib/query-keys";

export type Period =
  | "24h"
  | "3d"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "180d"
  | "all";

export type ItemRarity = "UNIQUE" | "HEROIC" | "LEGENDARY";

export type ItemType =
  | "ONE_HAND_WEAPON"
  | "TWO_HAND_WEAPON"
  | "ONE_AND_HALF_HAND_WEAPON"
  | "DISTANCE_WEAPON"
  | "HELP_WEAPON"
  | "WAND_WEAPON"
  | "ORB_WEAPON"
  | "ARMOR"
  | "HELMET"
  | "BOOTS"
  | "GLOVES"
  | "RING"
  | "NECKLACE"
  | "SHIELD"
  | "NEUTRAL"
  | "CONSUME"
  | "GOLD"
  | "KEYS"
  | "QUEST"
  | "RENEWABLE"
  | "ARROWS"
  | "TALISMAN"
  | "BOOK"
  | "BAG"
  | "BLESS"
  | "UPGRADE"
  | "RECIPE"
  | "COINAGE"
  | "QUIVER"
  | "OUTFITS"
  | "PETS"
  | "TELEPORTS";

export type LootStatsOverview = {
  totalLoots: number;
  totalItems: number;
  legendaryItems: number;
  heroicItems: number;
  avgItemLevel: number;
};

export type RarityStats = {
  count: number;
  percentage: number;
};

export type TimelinePoint = {
  date: string;
  total: number;
  byRarity: Partial<Record<ItemRarity, number>>;
};

export type TopNpc = {
  npcId: number;
  name: string;
  type: NpcType | null;
  lvl: number | null;
  icon: string | null;
  count: number;
  byRarity: Partial<Record<ItemRarity, number>>;
};

export type TopContributor = {
  memberId: number;
  name: string;
  avatar: string | null;
  userId: string;
  count: number;
  byRarity: Partial<Record<ItemRarity, number>>;
};

export type TopItem = {
  itemId: number;
  hid: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  lvl: number;
  count: number;
};

export type LootStatsResponse = {
  overview: LootStatsOverview;
  byRarity: Partial<Record<ItemRarity, RarityStats>>;
  timeline: TimelinePoint[];
  topNpcs: TopNpc[];
  topContributors: TopContributor[];
  topItems: TopItem[];
};

export type LootStatsFilters = {
  period?: Period;
  world?: string;
  npcTypes?: NpcType[];
  excludeColossus?: boolean;
};

export const useLootStats = (filters: LootStatsFilters = {}) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const queryParams = {
    period: filters.period || "7d",
    world: filters.world || undefined,
    npcTypes: filters.npcTypes?.join(",") || undefined,
    excludeColossus: filters.excludeColossus ? "true" : undefined,
  };

  const queryString = stringifyQueryParams(queryParams);

  return useQuery({
    queryKey: queryKeys.stats.lootStats(guildId, queryString),
    queryFn: async () => {
      const response = await client.get<LootStatsResponse>(
        `/guilds/${guildId}/loots/stats${queryString ? `?${queryString}` : ""}`,
      );
      return response;
    },
    enabled: !!guildId,
    staleTime: 30000,
  });
};
