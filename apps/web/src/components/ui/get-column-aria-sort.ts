import type { SortDirection } from "@tanstack/react-table";

type SortableColumn = {
  getIsSorted: () => false | SortDirection;
};

const ARIA_SORT_BY_DIRECTION = {
  asc: "ascending",
  desc: "descending",
} as const;

/** The `aria-sort` value for a column header; only the sorted column carries one. */
export const getColumnAriaSort = (column: SortableColumn) => {
  const sortDirection = column.getIsSorted();

  return sortDirection ? ARIA_SORT_BY_DIRECTION[sortDirection] : undefined;
};
