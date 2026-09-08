import { z } from "zod";
export const STATISTICS_TABS = [
  "overview",
  "activity",
  "monsters",
  "worlds",
] as const;
export const STATISTICS_DAYS = [7, 30, 90, 365] as const;
export type StatisticsTab = (typeof STATISTICS_TABS)[number];
export type StatisticsDays = (typeof STATISTICS_DAYS)[number];
export type StatisticsSearch = {
  tab: StatisticsTab;
  days: StatisticsDays;
  world?: string;
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
}).parse;
