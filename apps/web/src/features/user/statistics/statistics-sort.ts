import {
  functionalUpdate,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import type { StatisticsSort } from "./statistics-search";

export type StatisticsSortValue = { field: StatisticsSort; asc: boolean };

/** Rows ordered by one number; ties keep the server's order. */
export const sortStatisticsRows = <T>(
  rows: readonly T[],
  value: (row: T) => number,
  asc: boolean,
) =>
  rows
    .map((row, index) => ({ row, index }))
    .sort(
      (left, right) =>
        (asc ? 1 : -1) * (value(left.row) - value(right.row)) ||
        left.index - right.index,
    )
    .map(({ row }) => row);

/** A sortable field and the id of the table column that shows it. */
export type StatisticsSortColumn = readonly [StatisticsSort, string];

/** Bridges a table's sorting state and the URL's sort. */
export const statisticsTableSorting = (
  sort: StatisticsSortValue,
  columns: readonly StatisticsSortColumn[],
  onSortChange: (sort: StatisticsSortValue) => void,
) => {
  const columnId =
    columns.find(([field]) => field === sort.field)?.[1] ?? columns[0]?.[1];

  const sorting: SortingState = columnId
    ? [{ id: columnId, desc: !sort.asc }]
    : [];

  const onSortingChange = (updater: Updater<SortingState>) => {
    const [next] = functionalUpdate(updater, sorting);
    const field = columns.find(([, id]) => id === next?.id)?.[0];

    if (next && field) onSortChange({ field, asc: !next.desc });
  };

  return { state: { sorting }, onSortingChange };
};
