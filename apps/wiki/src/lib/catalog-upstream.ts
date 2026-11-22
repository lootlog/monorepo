import type {
  CatalogControllerGetEventsParams,
  CatalogControllerGetIndexParams,
  CatalogControllerGetItemsParams,
  CatalogControllerGetNpcsParams,
} from "@lootlog/client/catalog";
import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";

export const readCatalogUpstream = () => {
  const baseUrl = process.env.CATALOG_API_URL;
  const token = process.env.CATALOG_SERVICE_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "CATALOG_API_URL and CATALOG_SERVICE_TOKEN must be configured.",
    );
  }

  return { baseUrl, headers: { [CATALOG_SERVICE_TOKEN_HEADER]: token } };
};

const ITEM_PARAMETERS = {
  search: true,
  gameVersion: true,
  ids: true,
  rarities: true,
  types: true,
  categories: true,
  professions: true,
  minLevel: true,
  maxLevel: true,
  statKeys: true,
  excludedStatKeys: true,
  legendaryBonuses: true,
  dropSourceTypes: true,
  event: true,
  droppedBy: true,
  availableSince: true,
  sort: true,
  limit: true,
  offset: true,
} satisfies Record<keyof CatalogControllerGetItemsParams, true>;

const NPC_PARAMETERS = {
  search: true,
  gameVersion: true,
  ids: true,
  keys: true,
  types: true,
  bossOrigins: true,
  minLevel: true,
  maxLevel: true,
  firstSeenMonth: true,
  sort: true,
  limit: true,
  offset: true,
} satisfies Record<keyof CatalogControllerGetNpcsParams, true>;

const EVENT_PARAMETERS = {
  gameVersion: true,
} satisfies Record<keyof CatalogControllerGetEventsParams, true>;

const INDEX_PARAMETERS = {
  gameVersion: true,
} satisfies Record<keyof CatalogControllerGetIndexParams, true>;

const CATALOG_READS = new Map<string, ReadonlySet<string>>([
  ["catalog/items", new Set(Object.keys(ITEM_PARAMETERS))],
  ["catalog/npcs", new Set(Object.keys(NPC_PARAMETERS))],
  ["catalog/events", new Set(Object.keys(EVENT_PARAMETERS))],
  ["catalog/index", new Set(Object.keys(INDEX_PARAMETERS))],
]);

export const catalogUpstreamUrl = (
  baseUrl: string,
  path: string,
  search: string,
) => {
  const parameters = CATALOG_READS.get(path);

  if (!parameters) return undefined;

  const url = new URL(path, `${baseUrl.replace(/\/$/, "")}/`);

  for (const [name, value] of new URLSearchParams(search)) {
    if (parameters.has(name)) url.searchParams.append(name, value);
  }

  url.searchParams.sort();

  return url;
};
