const readList = (values: ReadonlyArray<string>): string[] | undefined => {
  const result = values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
};

const readNumber = (value: string | null, fallback: number): number => {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface GetItemsDto {
  readonly limit: number;
  readonly offset: number;
  readonly search?: string;
  readonly world?: string;
  readonly filter?: string | string[];
  readonly facets?: string[];
  readonly sort?: string[];
}

export const parseGetItemsQuery = (url: URL): GetItemsDto => {
  const filters = url.searchParams.getAll("filter");
  return {
    limit: readNumber(url.searchParams.get("limit"), 20),
    offset: readNumber(url.searchParams.get("offset"), 0),
    search: url.searchParams.get("search") ?? undefined,
    world: url.searchParams.get("world") ?? undefined,
    filter: filters.length > 1 ? filters : filters[0],
    facets: readList(url.searchParams.getAll("facets")),
    sort: readList(url.searchParams.getAll("sort")),
  };
};
