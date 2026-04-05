import { parseAsArrayOf, parseAsString } from "nuqs";
import { createQueryFilters } from "./create-query-filters";

export const useLootsFilters = createQueryFilters({
  search: parseAsString.withDefault(""),
  npcTypes: parseAsArrayOf(parseAsString).withDefault([]),
  npcs: parseAsArrayOf(parseAsString).withDefault([]),
  npcLevelMin: parseAsString.withDefault(""),
  npcLevelMax: parseAsString.withDefault(""),
  rarities: parseAsArrayOf(parseAsString).withDefault([]),
  itemLevelMin: parseAsString.withDefault(""),
  itemLevelMax: parseAsString.withDefault(""),
  hid: parseAsString.withDefault(""),
  itemNames: parseAsArrayOf(parseAsString).withDefault([]),
  players: parseAsArrayOf(parseAsString).withDefault([]),
  playerLevelMin: parseAsString.withDefault(""),
  playerLevelMax: parseAsString.withDefault(""),
});
