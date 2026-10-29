export type QueryRouteSearch = {
  query: string;
};

export function validateQueryRouteSearch(search: {
  query?: unknown;
}): QueryRouteSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
  };
}

export const getQueryRouteSearchParams = (
  search: QueryRouteSearch,
  limit: number,
) => {
  const query = search.query.trim();

  return { limit, search: query === "" ? undefined : query };
};
