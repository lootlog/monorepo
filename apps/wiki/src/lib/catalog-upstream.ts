import type {
  CatalogControllerGetEventsParams,
  CatalogControllerGetIndexParams,
  CatalogControllerGetItemsParams,
  CatalogControllerGetNpcsParams,
} from "@lootlog/client/catalog";
import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";

/**
 * The catalog service as the Worker reaches it. The token stays on the
 * server: the browser reads the catalog through the Worker's `/api/catalog`.
 */
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

// Every parameter of each read; the types keep each list complete.
const ITEM_PARAMETERS = {
  search: true,
  gameVersion: true,
  ids: true,
  rarities: true,
  types: true,
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
  limit: true,
  offset: true,
} satisfies Record<keyof CatalogControllerGetNpcsParams, true>;

const EVENT_PARAMETERS = {
  gameVersion: true,
} satisfies Record<keyof CatalogControllerGetEventsParams, true>;

const INDEX_PARAMETERS = {
  gameVersion: true,
} satisfies Record<keyof CatalogControllerGetIndexParams, true>;

/** The catalog reads the wiki's pages make; anything else stays unreachable. */
const CATALOG_READS = new Map<string, ReadonlySet<string>>([
  ["catalog/items", new Set(Object.keys(ITEM_PARAMETERS))],
  ["catalog/npcs", new Set(Object.keys(NPC_PARAMETERS))],
  ["catalog/events", new Set(Object.keys(EVENT_PARAMETERS))],
  ["catalog/index", new Set(Object.keys(INDEX_PARAMETERS))],
]);

/**
 * The catalog URL a browser's read asks for, or none for a read the wiki
 * does not make. Only the read's own parameters pass, in one order, so a
 * query the catalog would answer the same way shares one cached answer.
 */
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
