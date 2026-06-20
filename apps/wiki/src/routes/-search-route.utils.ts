export type BasicRouteSearch = {
  query: string;
  world: string;
};

export type SearchStatus = "error" | "idle" | "loading" | "ready";

export const emptyBasicRouteSearch: BasicRouteSearch = {
  query: "",
  world: "",
};

export function validateBasicRouteSearch(
  search: Record<string, unknown>,
): BasicRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    world: typeof search.world === "string" ? search.world : "",
  };
}

export function getBasicRouteSearchState({
  queryValue,
  worldValue,
}: {
  queryValue: string;
  worldValue: string;
}): BasicRouteSearch {
  return {
    query: queryValue.trim(),
    world: worldValue.trim(),
  };
}

export function isBasicRouteSearchActive(search: BasicRouteSearch): boolean {
  return search.query.trim() !== "" || search.world.trim() !== "";
}

export function areBasicRouteSearchStatesEqual(
  firstSearch: BasicRouteSearch,
  secondSearch: BasicRouteSearch,
): boolean {
  return (
    firstSearch.query === secondSearch.query &&
    firstSearch.world === secondSearch.world
  );
}

export function getBasicRouteSearchQueryParams(
  search: BasicRouteSearch,
  limit: number,
) {
  const query = search.query.trim();
  const world = search.world.trim();

  return {
    limit,
    search: query === "" ? undefined : query,
    world: world === "" ? undefined : world,
  };
}
