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
      if (typeof value === "string") return value !== "";
      return value !== null && value !== undefined;
    });

    const clearFilters = () => {
      const nulled = Object.fromEntries(
        Object.keys(schema).map((key) => [key, null]),
      ) as { [K in keyof T]: null };
      setFilters(nulled);
    };

    return {
      filters,
      setFilters,
      hasActiveFilters,
      clearFilters,
    };
  };
};
