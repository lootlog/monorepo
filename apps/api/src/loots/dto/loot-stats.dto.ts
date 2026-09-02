import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { booleanFromString } from "#src/shared/validation/query-helpers";
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

export type Period =
  | "24h"
  | "3d"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "180d"
  | "all";

const LootStatsQuerySchema = z.object({
  period: z
    .enum(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"])
    .default("7d")
    .optional(),
  world: z.string().optional(),
  npcTypes: z.string().optional(),
  excludeColossus: booleanFromString.optional(),
});

export class LootStatsQueryDto extends createSchemaClass(
  LootStatsQuerySchema,
) {}

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
