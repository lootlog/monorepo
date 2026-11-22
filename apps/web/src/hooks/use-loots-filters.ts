import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsString,
  type inferParserType,
} from "nuqs";
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

export type LootsFilters = inferParserType<typeof lootsFiltersParsers>;

export const useLootsFilters = createQueryFilters(lootsFiltersParsers);

export const loadLootsFilters = createLoader(lootsFiltersParsers);

export const serializeLootsFilters = createSerializer(lootsFiltersParsers);
