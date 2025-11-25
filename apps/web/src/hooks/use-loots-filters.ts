import { useQueryStates, parseAsArrayOf, parseAsString } from "nuqs";

export const useLootsFilters = () => {
  const [filters, setFilters] = useQueryStates(
    {
      // Search
      search: parseAsString.withDefault(""),

      // NPC filters
      npcTypes: parseAsArrayOf(parseAsString).withDefault([]),
      npcs: parseAsArrayOf(parseAsString).withDefault([]),
      npcLevelMin: parseAsString.withDefault(""),
      npcLevelMax: parseAsString.withDefault(""),

      // Item filters
      rarities: parseAsArrayOf(parseAsString).withDefault([]),
      itemLevelMin: parseAsString.withDefault(""),
      itemLevelMax: parseAsString.withDefault(""),

      // Player filters
      players: parseAsArrayOf(parseAsString).withDefault([]),
      playerLevelMin: parseAsString.withDefault(""),
      playerLevelMax: parseAsString.withDefault(""),

      // Legacy - to be removed from URL
      location: parseAsString.withDefault(""),
    },
    {
      history: "push",
      shallow: true,
    },
  );

  const hasActiveFilters = (): boolean => {
    return (
      filters.search !== "" ||
      filters.npcTypes.length > 0 ||
      filters.npcs.length > 0 ||
      filters.npcLevelMin !== "" ||
      filters.npcLevelMax !== "" ||
      filters.rarities.length > 0 ||
      filters.itemLevelMin !== "" ||
      filters.itemLevelMax !== "" ||
      filters.players.length > 0 ||
      filters.playerLevelMin !== "" ||
      filters.playerLevelMax !== ""
    );
  };

  const clearFilters = () => {
    setFilters({
      search: null,
      npcTypes: null,
      npcs: null,
      npcLevelMin: null,
      npcLevelMax: null,
      rarities: null,
      itemLevelMin: null,
      itemLevelMax: null,
      players: null,
      playerLevelMin: null,
      playerLevelMax: null,
      location: null,
    });
  };

  return {
    filters,
    setFilters,
    hasActiveFilters: hasActiveFilters(),
    clearFilters,
  };
};
