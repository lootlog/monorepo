import { isNotNil } from "es-toolkit";
import type { Battle } from "@/lib/api/battlelog-types";
import type {
  BattleStatCategoryDefinition,
  BattleStatDefinition,
  StatsCustomizationConfig,
} from "@/types/stats-customization.types";
import { STAT_CATEGORIES } from "./one-vs-one-stats-definitions";

type VisibleStatDefinition = BattleStatDefinition & {
  label: string;
};

export type VisibleStatCategory = {
  id: string;
  label: string;
  stats: VisibleStatDefinition[];
};

/** One table row: a category heading, or one of the stats listed under it. */
export type OneVsOneStatsRow =
  | { kind: "category"; id: string; searchKey: string; label: string }
  | {
      kind: "stat";
      id: string;
      searchKey: string;
      stat: VisibleStatDefinition;
    };

const normalizeStatSearchText = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const getMatchingStatSearchKey = (
  query: string,
  categories: VisibleStatCategory[],
) => {
  const normalizedQuery = normalizeStatSearchText(query);

  if (!normalizedQuery) {
    return null;
  }

  for (const category of categories) {
    const categoryIndex = normalizeStatSearchText(
      `${category.label} ${category.id}`,
    );

    if (categoryIndex.includes(normalizedQuery)) {
      return `category:${category.id}`;
    }

    for (const stat of category.stats) {
      const statIndex = normalizeStatSearchText(
        `${stat.label} ${String(stat.key)}`,
      );

      if (statIndex.includes(normalizedQuery)) {
        return `stat:${String(stat.key)}`;
      }
    }
  }

  return null;
};

export const getVisibleStats = ({
  config,
  hideZeros,
  opponent,
  t,
  user,
}: {
  config: StatsCustomizationConfig;
  hideZeros: boolean;
  opponent: Battle["warriors"][number] | undefined;
  t: (key: string) => string;
  user: Battle["warriors"][number] | undefined;
}): VisibleStatCategory[] => {
  const categoriesMap = new Map<string, BattleStatCategoryDefinition>(
    STAT_CATEGORIES.map((category) => [category.id, category]),
  );

  const allStatsMap = new Map<string, BattleStatDefinition>();

  for (const category of STAT_CATEGORIES) {
    for (const stat of category.stats) allStatsMap.set(String(stat.key), stat);
  }

  return config.categoryOrder
    .map((categoryId) => {
      const customization = config.categories[categoryId];
      const categoryDefinition = categoriesMap.get(categoryId);

      if (!customization?.visible) return null;

      const orderedStats = customization.statOrder
        .map((statKey) => allStatsMap.get(statKey))
        .filter(isNotNil);

      const filteredStats =
        hideZeros && user && opponent
          ? orderedStats.filter((stat) => {
              const userValue = user[stat.key];
              const opponentValue = opponent[stat.key];
              const userNumber = Number.isFinite(userValue) ? userValue : 0;

              const opponentNumber = Number.isFinite(opponentValue)
                ? opponentValue
                : 0;

              return userNumber !== 0 || opponentNumber !== 0;
            })
          : orderedStats;

      if (filteredStats.length === 0) return null;

      return {
        id: categoryId,
        label:
          customization.name ??
          (categoryDefinition
            ? t(categoryDefinition.labelKey)
            : customization.id),
        stats: filteredStats.map((stat) => ({
          ...stat,
          label: t(stat.labelKey),
        })),
      };
    })
    .filter(isNotNil);
};

/** Flattens the categories into the rows the table renders, in display order. */
export const getOneVsOneStatsRows = (
  categories: VisibleStatCategory[],
): OneVsOneStatsRow[] =>
  categories.flatMap((category) => [
    {
      kind: "category" as const,
      id: `category-${category.id}`,
      searchKey: `category:${category.id}`,
      label: category.label,
    },
    ...category.stats.map((stat) => ({
      kind: "stat" as const,
      id: `${category.id}-${String(stat.key)}`,
      searchKey: `stat:${String(stat.key)}`,
      stat,
    })),
  ]);
