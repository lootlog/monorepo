import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { LootsControllerGetLootStatsQuery as LootStatsQueryDto } from "#src/http-api/contracts/loots/schemas";

export type { LootStatsQueryDto };

export type Period =
  | "24h"
  | "3d"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "180d"
  | "all";

export interface LootStatsOverview {
  totalLoots: number;
  totalItems: number;
  legendaryItems: number;
  heroicItems: number;
  avgItemLevel: number;
}

export interface RarityStats {
  count: number;
  percentage: number;
}

export interface TimelinePoint {
  date: string;
  total: number;
  byRarity: Partial<Record<ItemRarity, number>>;
}

export interface TopNpc {
  npcId: number;
  name: string;
  type: NpcType | null;
  lvl: number | null;
  icon: string | null;
  count: number;
  byRarity: Partial<Record<ItemRarity, number>>;
}

export interface TopContributor {
  memberId: number;
  name: string;
  avatar: string | null;
  userId: string;
  count: number;
  byRarity: Partial<Record<ItemRarity, number>>;
}

export interface TopItem {
  itemId: number;
  hid: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  lvl: number;
  count: number;
}

export interface LootStatsResponse {
  overview: LootStatsOverview;
  byRarity: Partial<Record<ItemRarity, RarityStats>>;
  timeline: TimelinePoint[];
  topNpcs: TopNpc[];
  topContributors: TopContributor[];
  topItems: TopItem[];
}
