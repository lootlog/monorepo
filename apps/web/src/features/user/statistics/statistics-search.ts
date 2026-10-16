import { z } from "zod";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";

export const STATISTICS_TABS = ["overview", "activity", "monsters"] as const;

export const STATISTICS_DAYS = [7, 30, 90, 365] as const;

/** The monster ranking: most killed, or the biggest gain on the previous period. */
export const STATISTICS_RANKINGS = ["top", "gains"] as const;

export type StatisticsTab = (typeof STATISTICS_TABS)[number];

export type StatisticsDays = (typeof STATISTICS_DAYS)[number];

export type StatisticsRanking = (typeof STATISTICS_RANKINGS)[number];

export type StatisticsNpcType = (typeof TRACKABLE_NPC_TYPES)[number];

export type StatisticsSearch = {
  tab: StatisticsTab;
  days: StatisticsDays;
  world?: string;
  /** Narrows the monster ranking. */
  npcType?: StatisticsNpcType;
  ranking?: StatisticsRanking;
};

export const parseStatisticsSearch = z.object({
  tab: z.enum(STATISTICS_TABS).catch("overview"),
  days: z.coerce
    .number()
    .transform((days) => STATISTICS_DAYS.find((value) => value === days) ?? 30)
    .catch(30),
  world: z
    .string()
    .transform((world) => world.trim().slice(0, 100) || undefined)
    .optional()
    .catch(undefined),
  npcType: z
    .string()
    .transform((type) => TRACKABLE_NPC_TYPES.find((value) => value === type))
    .optional()
    .catch(undefined),
  ranking: z.enum(STATISTICS_RANKINGS).optional().catch(undefined),
}).parse;
