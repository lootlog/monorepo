import type { StatisticsFiltersProps } from "./statistics-filters";

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
