import {
  createLoader,
  createSerializer,
  parseAsString,
  parseAsBoolean,
  parseAsStringLiteral,
  parseAsArrayOf,
  parseAsInteger,
} from "nuqs";

export const battleQueryParsers = {
  cursor: parseAsString,
  world: parseAsString,
  type: parseAsArrayOf(parseAsStringLiteral(["solo", "group"] as const)),
  search: parseAsString,
  result: parseAsArrayOf(
    parseAsStringLiteral(["won", "lost", "flee"] as const),
  ),
  ph: parseAsBoolean,
  matchmaking: parseAsBoolean,
  startDate: parseAsString,
  endDate: parseAsString,
  characterId: parseAsArrayOf(parseAsString),
  minLevel: parseAsInteger.withDefault(1),
  maxLevel: parseAsInteger.withDefault(500),
};

export const loadBattlePanelBattlesSearch = createLoader(battleQueryParsers);

export const serializeBattlePanelBattlesSearch =
  createSerializer(battleQueryParsers);
