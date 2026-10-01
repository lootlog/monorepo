export type QueryRouteSearch = {
  query: string;
};

export type QueryAndWorldRouteSearch = QueryRouteSearch & {
  world: string;
};

export type BasicRouteSearch = QueryRouteSearch | QueryAndWorldRouteSearch;

export type SearchStatus = "error" | "idle" | "loading" | "ready";

export function validateQueryRouteSearch(search: {
  query?: unknown;
}): QueryRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
  };
}

export function validateQueryAndWorldRouteSearch(search: {
  query?: unknown;
  world?: unknown;
}): QueryAndWorldRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    world: typeof search.world === "string" ? search.world : "",
  };
}

const getWorld = (search: BasicRouteSearch) =>
  "world" in search ? search.world : undefined;

/** Keeps the shape of `search`: `world` is set only on routes that have it. */
export function getBasicRouteSearchState<TSearch extends BasicRouteSearch>(
  search: TSearch,
  { queryValue, worldValue }: { queryValue: string; worldValue: string },
): TSearch {
  const query = queryValue.trim();

  return "world" in search
    ? { ...search, query, world: worldValue.trim() }
    : { ...search, query };
}

export function isBasicRouteSearchActive(search: BasicRouteSearch): boolean {
  return search.query.trim() !== "" || Boolean(getWorld(search)?.trim());
}

export function areBasicRouteSearchStatesEqual(
  firstSearch: BasicRouteSearch,
  secondSearch: BasicRouteSearch,
): boolean {
  return (
    firstSearch.query === secondSearch.query &&
    getWorld(firstSearch) === getWorld(secondSearch)
  );
}

export function getBasicRouteSearchQueryParams(
  search: BasicRouteSearch,
  limit: number,
) {
  const query = search.query.trim();
  const params = { limit, search: query === "" ? undefined : query };
  const world = getWorld(search)?.trim();

  return world ? { ...params, world } : params;
}
