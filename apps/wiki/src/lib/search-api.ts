import { SEARCH_API_URL } from "@/config/api";
import type { NpcHit, PlayerHit, SearchItemsResponse } from "@/types/search";

type SearchParamsValue = string | number | undefined;

function getSearchBaseUrl() {
  if (SEARCH_API_URL) {
    return SEARCH_API_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  throw new Error(
    "VITE_SEARCH_API_URL must be configured for search requests.",
  );
}

function buildSearchUrl(
  path: string,
  params: Record<string, SearchParamsValue>,
) {
  const url = new URL(path, getSearchBaseUrl());

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function fetchSearchJson<T>(
  path: string,
  params: Record<string, SearchParamsValue>,
): Promise<T> {
  const response = await fetch(buildSearchUrl(path, params));

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchItemsSearch(params: {
  filter?: string;
  limit?: number;
  query?: string;
  world?: string;
}) {
  return fetchSearchJson<SearchItemsResponse>("/items", {
    filter: params.filter,
    limit: params.limit ?? 24,
    search: params.query,
    world: params.world,
  });
}

export function fetchNpcsSearch(params: {
  limit?: number;
  query?: string;
  world?: string;
}) {
  return fetchSearchJson<NpcHit[]>("/npcs", {
    limit: params.limit ?? 24,
    search: params.query,
    world: params.world,
  });
}

export function fetchPlayersSearch(params: {
  limit?: number;
  query?: string;
  world?: string;
}) {
  return fetchSearchJson<PlayerHit[]>("/players", {
    limit: params.limit ?? 24,
    search: params.query,
    world: params.world,
  });
}
