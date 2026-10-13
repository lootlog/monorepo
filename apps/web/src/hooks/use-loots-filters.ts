import { createSerializer, parseAsArrayOf, parseAsString } from "nuqs";
import { createQueryFilters } from "./create-query-filters";

const lootsFiltersParsers = {
  search: parseAsString.withDefault(""),
  npcTypes: parseAsArrayOf(parseAsString).withDefault([]),
  npcs: parseAsArrayOf(parseAsString).withDefault([]),
  npcLevelMin: parseAsString.withDefault(""),
  npcLevelMax: parseAsString.withDefault(""),
  rarities: parseAsArrayOf(parseAsString).withDefault([]),
  professions: parseAsArrayOf(parseAsString).withDefault([]),
  itemLevelMin: parseAsString.withDefault(""),
  itemLevelMax: parseAsString.withDefault(""),
  hid: parseAsString.withDefault(""),
  itemNames: parseAsArrayOf(parseAsString).withDefault([]),
  players: parseAsArrayOf(parseAsString).withDefault([]),
  playerLevelMin: parseAsString.withDefault(""),
  playerLevelMax: parseAsString.withDefault(""),
};

export const useLootsFilters = createQueryFilters(lootsFiltersParsers);

/** Builds a loot list URL with the given filters, for links from other pages. */
export const serializeLootsFilters = createSerializer(lootsFiltersParsers);
