import {
  parseAsString,
  parseAsBoolean,
  parseAsStringLiteral,
  parseAsArrayOf,
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
  characterId: parseAsArrayOf(parseAsString),
};
