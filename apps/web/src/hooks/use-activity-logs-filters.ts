import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";

export const useActivityLogsFilters = () => {
  const [filters, setFilters] = useQueryStates(
    {
      types: parseAsArrayOf(parseAsString).withDefault([]),
      sources: parseAsArrayOf(parseAsString).withDefault([]),
      startDate: parseAsString.withDefault(""),
      endDate: parseAsString.withDefault(""),
      name: parseAsString.withDefault(""),
      clanName: parseAsString.withDefault(""),
      world: parseAsString.withDefault(""),
    },
    {
      history: "push",
      shallow: true,
    },
  );

  const hasActiveFilters = (): boolean => {
    return (
      filters.types.length > 0 ||
      filters.sources.length > 0 ||
      filters.startDate !== "" ||
      filters.endDate !== "" ||
      filters.name !== "" ||
      filters.clanName !== "" ||
      filters.world !== ""
    );
  };

  const clearFilters = () => {
    setFilters({
      types: null,
      sources: null,
      startDate: null,
      endDate: null,
      name: null,
      clanName: null,
      world: null,
    });
  };

  return {
    filters,
    setFilters,
    hasActiveFilters: hasActiveFilters(),
    clearFilters,
  };
};
