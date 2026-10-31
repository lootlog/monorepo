import { joinList, splitList } from "@/lib/items-search";
import { NPC_TYPE_OPTIONS, type NpcTypeOption } from "@/lib/npc-types";

export type QueryRouteSearch = {
  query: string;
};

/** The NPC search as the address bar holds it; `types` is comma separated. */
export type NpcsRouteSearch = QueryRouteSearch & {
  types: string;
};

const isNpcType = (value: string): value is NpcTypeOption =>
  NPC_TYPE_OPTIONS.some((type) => type === value);

export function validateNpcsRouteSearch(search: {
  query?: unknown;
  types?: unknown;
}): NpcsRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    types:
      typeof search.types === "string"
        ? joinList(splitList(search.types).filter(isNpcType))
        : "",
  };
}

export const getNpcsRouteSearchParams = (
  search: NpcsRouteSearch,
  limit: number,
) => {
  const query = search.query.trim();
  const types = splitList(search.types).filter(isNpcType);

  return {
    limit,
    search: query === "" ? undefined : query,
    types: types.length === 0 ? undefined : types,
  };
};
