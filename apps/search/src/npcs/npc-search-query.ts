import {
  parseCommaSeparatedQueryList,
  parseSearchTermsQuery,
} from "#src/shared/query-list";
export interface NpcSearchQuery {
  readonly ids?: number[];
  readonly limit: number;
  readonly search?: string | string[];
  readonly world?: string;
}
export const parseGetNpcsQuery = (url: URL): NpcSearchQuery => {
  const rawIds = parseCommaSeparatedQueryList(
    url.searchParams.get("ids") ?? undefined,
  );
  const rawSearch = parseSearchTermsQuery(
    url.searchParams.get("search") ?? undefined,
  );
  return {
    ids: Array.isArray(rawIds)
      ? rawIds.map(Number).filter(Number.isSafeInteger)
      : undefined,
    limit: Number(url.searchParams.get("limit") ?? 10),
    search:
      typeof rawSearch === "string" || Array.isArray(rawSearch)
        ? rawSearch
        : undefined,
    world: url.searchParams.get("world") ?? undefined,
  };
};
