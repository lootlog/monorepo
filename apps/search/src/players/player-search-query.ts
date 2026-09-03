import { parseSearchTermsQuery } from "#src/shared/query-list";
export interface PlayerSearchQuery {
  readonly limit: number;
  readonly search?: string | string[];
  readonly world?: string;
}
export const parseGetPlayersQuery = (url: URL): PlayerSearchQuery => {
  const rawSearch = parseSearchTermsQuery(
    url.searchParams.get("search") ?? undefined,
  );
  return {
    limit: Number(url.searchParams.get("limit") ?? 10),
    search:
      typeof rawSearch === "string" || Array.isArray(rawSearch)
        ? rawSearch
        : undefined,
    world: url.searchParams.get("world") ?? undefined,
  };
};
