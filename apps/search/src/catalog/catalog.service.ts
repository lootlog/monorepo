import { Effect } from "effect";
import type { Meilisearch, SearchParams } from "meilisearch";
import { attemptMeilisearch } from "#src/meilisearch/search-operation-failure";
import { buildMeilisearchInFilter } from "#src/meilisearch/query-builder";
import { ITEMS_INDEX } from "#src/items/search-index";
import type { DropSource } from "#src/items/item-drops";
import { collapseByNameAndType } from "#src/npcs/npcs.service";
import { NPCS_INDEX } from "#src/npcs/search-index";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { AppLogger } from "#src/shared/logger";
import type {
  CatalogControllerGetItemsQuery,
  CatalogControllerGetNpcsQuery,
  CatalogItemsResponseDto_Output,
  CatalogNpcsResponseDto_Output,
} from "#src/http-api/contracts/catalog/schemas";

const MAX_LIMIT = 96;

// Margonem item types are upper-case words, such as `ONE_HAND_WEAPON`.
const ITEM_TYPE = /^[A-Z_]+$/;

// Catalog keys are the search service's own: an edition, an optional
// namespace and numeric ids, such as `pl_template_257636_2`.
const CATALOG_KEY = /^[a-z]{2}(?:_[a-z]+)?_\d+_\d+$/;

// Event slugs are `itemEventSlug`'s: lower-case words joined by hyphens.
const EVENT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CatalogItemDocument = {
  id: number;
  name: string;
  icon: string;
  stat: string;
  lvl: number;
  rarity: string | null;
  type: string | null;
  droppedBy?: DropSource[];
  retiredDropMonsterKeys?: string[];
};

type CatalogNpcDocument = {
  uid: string;
  id: number;
  identityNamespace: NpcIdentityNamespace;
  name: string;
  icon: string;
  lvl: number;
  type: CatalogNpcsResponseDto_Output["hits"][number]["type"];
  gameVersion: CatalogNpcsResponseDto_Output["hits"][number]["gameVersion"];
};

const page = (query: { limit?: number; offset?: number }) => ({
  limit: Math.min(Math.max(Math.floor(query.limit ?? 24), 1), MAX_LIMIT),
  offset: Math.max(Math.floor(query.offset ?? 0), 0),
});

const sortBy = (sort: CatalogControllerGetItemsQuery["sort"]) =>
  sort === undefined || sort === "relevance" ? undefined : [sort];

const gameVersionFilter = (gameVersion: string | undefined) =>
  gameVersion === undefined
    ? undefined
    : `gameVersion = ${JSON.stringify(gameVersion)}`;

const levelFilter = (operator: ">=" | "<=", level: number | undefined) =>
  level === undefined ? undefined : `lvl ${operator} ${Math.floor(level)}`;

/** The item filters of a query; `monsterKey` is the drop source's monster. */
const itemFilters = (
  query: CatalogControllerGetItemsQuery,
  monsterKey: string | undefined,
) => {
  const types = query.types?.filter((type) => ITEM_TYPE.test(type));

  return [
    gameVersionFilter(query.gameVersion),
    query.ids?.length ? buildMeilisearchInFilter("id", query.ids) : undefined,
    query.rarities?.length
      ? buildMeilisearchInFilter("rarity", query.rarities)
      : undefined,
    types?.length ? buildMeilisearchInFilter("type", types) : undefined,
    query.professions?.length
      ? buildMeilisearchInFilter("requiredProfessions", query.professions)
      : undefined,
    levelFilter(">=", query.minLevel),
    levelFilter("<=", query.maxLevel),
    ...(query.statKeys ?? []).map(
      (key) => `statsKeys = ${JSON.stringify(key)}`,
    ),
    ...(query.excludedStatKeys ?? []).map(
      (key) => `NOT statsKeys = ${JSON.stringify(key)}`,
    ),
    query.legendaryBonuses?.length
      ? buildMeilisearchInFilter("legendaryBonus", query.legendaryBonuses)
      : undefined,
    query.dropSourceTypes?.length
      ? buildMeilisearchInFilter("droppedByTypes", query.dropSourceTypes)
      : undefined,
    query.event === undefined
      ? undefined
      : `eventSlugs = ${JSON.stringify(query.event)}`,
    monsterKey === undefined
      ? undefined
      : `droppedByMonsterKeys = ${JSON.stringify(monsterKey)}`,
    query.droppedBy === undefined || monsterKey !== undefined
      ? undefined
      : `droppedByKeys = ${JSON.stringify(query.droppedBy)}`,
  ].filter((filter) => filter !== undefined);
};

export const makeCatalogModule = (
  meilisearch: Meilisearch,
  logger: AppLogger,
) => {
  /** The monster an NPC key belongs to; none for an entry indexed before. */
  const findMonsterKey = (npcKey: string) =>
    attemptMeilisearch("catalog.npcs.monster", () =>
      meilisearch.index<{ monsterKey?: string }>(NPCS_INDEX).search("", {
        filter: `uid = ${JSON.stringify(npcKey)}`,
        limit: 1,
        attributesToRetrieve: ["monsterKey"],
      }),
    ).pipe(Effect.map(({ hits }) => hits[0]?.monsterKey));

  const getItems = Effect.fn("Catalog.items")(function* (
    query: CatalogControllerGetItemsQuery,
  ) {
    // An unknown key matches no NPC, and a malformed event slug no event, so
    // neither matches an item.
    if (
      (query.droppedBy !== undefined && !CATALOG_KEY.test(query.droppedBy)) ||
      (query.event !== undefined && !EVENT_SLUG.test(query.event))
    ) {
      return { hits: [], estimatedTotalHits: 0 };
    }

    // Any identity of a monster lists the drops of all of them.
    const monsterKey =
      query.droppedBy === undefined
        ? undefined
        : yield* findMonsterKey(query.droppedBy);

    const filters = itemFilters(query, monsterKey);

    const params: SearchParams = {
      ...page(query),
      attributesToSearchOn: ["name"],
      attributesToRetrieve: [
        "id",
        "name",
        "icon",
        "stat",
        "lvl",
        "rarity",
        "type",
        "droppedBy",
        "retiredDropMonsterKeys",
      ],
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      sort: sortBy(query.sort),
    };

    const response = yield* attemptMeilisearch("catalog.items", () =>
      meilisearch
        .index<CatalogItemDocument>(ITEMS_INDEX)
        .search(query.search ?? "", params),
    ).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Catalog items error", { error })),
      ),
    );

    return {
      estimatedTotalHits: response.estimatedTotalHits ?? response.hits.length,
      hits: response.hits.map(
        ({ droppedBy, retiredDropMonsterKeys, ...item }) => ({
          ...item,
          // A boss seen by older clients keeps a runtime or legacy entry beside
          // its template one; each monster is listed once.
          droppedBy: collapseByNameAndType(droppedBy ?? []).map(
            ({
              identityNamespace: _namespace,
              gameVersion: _edition,
              monsterKey,
              ...source
            }) => ({
              ...source,
              retired: retiredDropMonsterKeys?.includes(monsterKey) ?? false,
            }),
          ),
        }),
      ),
    } satisfies CatalogItemsResponseDto_Output;
  });

  const getNpcs = Effect.fn("Catalog.npcs")(function* (
    query: CatalogControllerGetNpcsQuery,
  ) {
    const keys = query.keys?.filter((key) => CATALOG_KEY.test(key));

    if (query.keys !== undefined && keys?.length === 0) {
      return { hits: [], estimatedTotalHits: 0 };
    }

    const filters = [
      gameVersionFilter(query.gameVersion),
      query.ids?.length ? buildMeilisearchInFilter("id", query.ids) : undefined,
      keys?.length ? buildMeilisearchInFilter("uid", keys) : undefined,
      query.types?.length
        ? buildMeilisearchInFilter("type", query.types)
        : undefined,
    ].filter((filter) => filter !== undefined);

    const params: SearchParams = {
      ...page(query),
      attributesToRetrieve: [
        "uid",
        "id",
        "identityNamespace",
        "name",
        "icon",
        "lvl",
        "type",
        "gameVersion",
      ],
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      // Pages and counts are over monsters, not over their catalog identities.
      distinct: "monsterKey",
    };

    const response = yield* attemptMeilisearch("catalog.npcs", () =>
      meilisearch
        .index<CatalogNpcDocument>(NPCS_INDEX)
        .search(query.search ?? "", params),
    ).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Catalog NPCs error", { error })),
      ),
    );

    return {
      estimatedTotalHits: response.estimatedTotalHits ?? response.hits.length,
      hits: collapseByNameAndType(response.hits).map(
        ({ uid, identityNamespace: _namespace, ...npc }) => ({
          ...npc,
          key: uid,
        }),
      ),
    } satisfies CatalogNpcsResponseDto_Output;
  });

  return { getItems, getNpcs };
};
