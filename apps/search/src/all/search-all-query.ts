export interface SearchAllQuery {
  readonly limit: number;
  readonly search?: string;
  readonly world?: string;
}
export const parseSearchAllQuery = (url: URL): SearchAllQuery => ({
  limit: Number(url.searchParams.get("limit") ?? 10),
  search: url.searchParams.get("search") ?? undefined,
  world: url.searchParams.get("world") ?? undefined,
});
