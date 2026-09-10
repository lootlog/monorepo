import { useQueryStates, type UseQueryStatesKeysMap } from "nuqs";

export const createQueryFilters = <T extends UseQueryStatesKeysMap>(
  schema: T,
) => {
  return () => {
    const [filters, setFilters] = useQueryStates(schema, {
      history: "push",
      shallow: true,
    });

    const hasActiveFilters = Object.values(filters).some((value) => {
      if (Array.isArray(value)) return value.length > 0;

      if (value === "") return false;

      return value !== null && value !== undefined;
    });

    const clearFilters = () => {
      setFilters(null);
    };

    return {
      filters,
      setFilters,
      hasActiveFilters,
      clearFilters,
    };
  };
};
