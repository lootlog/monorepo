import {
  CHANGELOG_ENTRY_TYPES,
  CHANGELOG_SURFACES,
} from "@lootlog/changelog/changelog";
import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs";
import { createQueryFilters } from "@/hooks/create-query-filters";

/** The filters of the "Co nowego" page, kept in its address. */
export const useWhatsNewFilters = createQueryFilters({
  surfaces: parseAsArrayOf(
    parseAsStringLiteral(CHANGELOG_SURFACES),
  ).withDefault([]),
  types: parseAsArrayOf(
    parseAsStringLiteral(CHANGELOG_ENTRY_TYPES),
  ).withDefault([]),
  q: parseAsString.withDefault(""),
});
