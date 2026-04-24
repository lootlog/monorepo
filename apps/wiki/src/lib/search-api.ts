import type { NpcHit, PlayerHit, SearchItemsResponse } from "@/types/search";

type SearchParamsValue = string | number | undefined;

function buildSearchUrl(
  searchApiUrl: string,
  path: string,
  params: Record<string, SearchParamsValue>,
) {
  const url = new URL(path, searchApiUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function fetchSearchJson<T>(
  searchApiUrl: string,
  path: string,
  params: Record<string, SearchParamsValue>,
): Promise<T> {
  const response = await fetch(buildSearchUrl(searchApiUrl, path, params));

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchItemsSearch(params: {
  filter?: string;
  limit?: number;
  query?: string;
  searchApiUrl: string;
  world?: string;
}) {
  return fetchSearchJson<SearchItemsResponse>(params.searchApiUrl, "/items", {
    filter: params.filter,
    limit: params.limit ?? 24,
    search: params.query,
    world: params.world,
  });
}

export function fetchNpcsSearch(params: {
  limit?: number;
  query?: string;
  searchApiUrl: string;
  world?: string;
}) {
  return fetchSearchJson<NpcHit[]>(params.searchApiUrl, "/npcs", {
    limit: params.limit ?? 24,
    search: params.query,
    world: params.world,
  });
}

export function fetchPlayersSearch(params: {
  limit?: number;
  query?: string;
  searchApiUrl: string;
  world?: string;
}) {
  return fetchSearchJson<PlayerHit[]>(params.searchApiUrl, "/players", {
    limit: params.limit ?? 24,
    search: params.query,
    world: params.world,
  });
}
