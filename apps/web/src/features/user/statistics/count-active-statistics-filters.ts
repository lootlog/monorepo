import type { StatisticsFiltersProps } from "./statistics-filters";

/**
 * How many statistics filters narrow the results, for the button that opens
 * them on narrow pages.
 */
export const countActiveStatisticsFilters = ({
  world,
  days,
  npcType,
  sort,
}: StatisticsFiltersProps) =>
  [
    Boolean(world),
    days !== 30,
    Boolean(npcType?.value),
    sort && (sort.value.field !== sort.fields[0] || sort.value.asc),
  ].filter(Boolean).length;
