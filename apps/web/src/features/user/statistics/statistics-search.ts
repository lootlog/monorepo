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

export function parseStatisticsSearch(
  search: Record<string, unknown>,
): StatisticsSearch {
  const tab =
    STATISTICS_TABS.find((value) => value === search.tab) ?? "overview";
  const days =
    STATISTICS_DAYS.find((value) => value === Number(search.days)) ?? 30;
  const world =
    typeof search.world === "string"
      ? search.world.trim().slice(0, 100) || undefined
      : undefined;
  return { tab, days, world };
}
