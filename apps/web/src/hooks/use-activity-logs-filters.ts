import { parseAsArrayOf, parseAsString } from "nuqs";
import { createQueryFilters } from "./create-query-filters";

export const useActivityLogsFilters = createQueryFilters({
  types: parseAsArrayOf(parseAsString).withDefault([]),
  sources: parseAsArrayOf(parseAsString).withDefault([]),
  startDate: parseAsString.withDefault(""),
  endDate: parseAsString.withDefault(""),
  name: parseAsString.withDefault(""),
  clanName: parseAsString.withDefault(""),
  world: parseAsString.withDefault(""),
});
