import { useNavigate } from "@tanstack/react-router";
import {
  resolveStatisticsSort,
  STATISTICS_SORT_FIELDS,
  type StatisticsSearch,
  type StatisticsSortTab,
} from "./statistics-search";
import type { StatisticsSortValue } from "./statistics-sort";
import type { StatisticsFiltersProps } from "./statistics-filters";

/** A ranking tab's sort, kept in the URL; the default leaves it clean. */
export const useStatisticsSort = (
  tab: StatisticsSortTab,
  search: StatisticsSearch,
) => {
  const navigate = useNavigate({ from: "/@me/statistics" });

  const onSortChange = ({ field, asc }: StatisticsSortValue) => {
    const isDefault = field === STATISTICS_SORT_FIELDS[tab][0] && !asc;

    void navigate({
      search: (current) => ({
        ...current,
        sort: isDefault ? undefined : field,
        asc: asc || undefined,
      }),
    });
  };

  return { sort: resolveStatisticsSort(tab, search), onSortChange };
};

/** The filter panel's sort field on a ranking tab; none on the other tabs. */
export const useStatisticsSortFilter = (
  search: StatisticsSearch,
): StatisticsFiltersProps["sort"] => {
  const tab =
    search.tab === "monsters" || search.tab === "legends"
      ? search.tab
      : undefined;

  const { sort, onSortChange } = useStatisticsSort(tab ?? "monsters", search);

  return tab
    ? {
        tab,
        fields: STATISTICS_SORT_FIELDS[tab],
        value: sort,
        onChange: onSortChange,
      }
    : undefined;
};
