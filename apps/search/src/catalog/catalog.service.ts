import { getDateFormatter } from "@lootlog/datetime";
import { Effect } from "effect";
import type { Meilisearch, SearchParams } from "meilisearch";
import { attemptMeilisearch } from "#src/meilisearch/search-operation-failure";
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

/** The players' calendar day; the catalog never shows the time of a drop. */
const POLISH_TIME_ZONE = "Europe/Warsaw";

type CatalogItemDocument = {
  id: number;
  name: string;
  icon: string;
  stat: string;
  lvl: number;
  rarity: string | null;
  type: string | null;
  firstSeenAt?: number | null;
  droppedBy?: DropSource[];
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
  firstSeenAt?: number | null;
};

const toFirstSeenOn = (firstSeenAt: number | null | undefined) =>
  firstSeenAt === null || firstSeenAt === undefined
    ? null
    : getDateFormatter(POLISH_TIME_ZONE).format(new Date(firstSeenAt));

const inFilter = (attribute: string, values: ReadonlyArray<string | number>) =>
  `${attribute} IN [${values.map((value) => JSON.stringify(value)).join(", ")}]`;

const page = (query: { limit?: number; offset?: number }) => ({
  limit: Math.min(Math.max(Math.floor(query.limit ?? 24), 1), MAX_LIMIT),
  offset: Math.max(Math.floor(query.offset ?? 0), 0),
});

/** Newest first; entries without a first sighting sort after every dated one. */
const sortBy = (sort: CatalogControllerGetItemsQuery["sort"]) => {
  if (sort === undefined || sort === "relevance") return undefined;

  return [sort === "newest" ? "firstSeenAt:desc" : sort];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const levelFilter = (operator: ">=" | "<=", level: number | undefined) =>
  level === undefined ? undefined : `lvl ${operator} ${Math.floor(level)}`;

/** The item filters of a query; `monsterKey` is the drop source's monster. */
const itemFilters = (
  query: CatalogControllerGetItemsQuery,
  monsterKey: string | undefined,
) => {
  const types = query.types?.filter((type) => ITEM_TYPE.test(type));

  return [
    query.ids?.length ? inFilter("id", query.ids) : undefined,
    query.rarities?.length ? inFilter("rarity", query.rarities) : undefined,
    types?.length ? inFilter("type", types) : undefined,
    query.professions?.length
      ? inFilter("requiredProfessions", query.professions)
      : undefined,
    levelFilter(">=", query.minLevel),
    levelFilter("<=", query.maxLevel),
    ...(query.statKeys ?? []).map(
      (key) => `statsKeys = ${JSON.stringify(key)}`,
    ),
    query.dropSourceTypes?.length
      ? inFilter("droppedByTypes", query.dropSourceTypes)
      : undefined,
    query.firstSeenWithinDays === undefined
      ? undefined
      : `firstSeenAt >= ${Date.now() - Math.max(query.firstSeenWithinDays, 0) * DAY_MS}`,
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
    // An unknown key matches no NPC, so it matches no item either.
    if (query.droppedBy !== undefined && !CATALOG_KEY.test(query.droppedBy)) {
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
        "firstSeenAt",
        "droppedBy",
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
      hits: response.hits.map(({ firstSeenAt, droppedBy, ...item }) => ({
        ...item,
        firstSeenOn: toFirstSeenOn(firstSeenAt),
        // A boss seen by older clients keeps a runtime or legacy entry beside
        // its template one; each monster is listed once.
        droppedBy: collapseByNameAndType(droppedBy ?? []).map(
          ({
            identityNamespace: _namespace,
            gameVersion: _edition,
            monsterKey: _monster,
            ...source
          }) => source,
        ),
      })),
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
      keys?.length ? inFilter("uid", keys) : undefined,
      query.types?.length ? inFilter("type", query.types) : undefined,
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
        "firstSeenAt",
      ],
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      sort: sortBy(query.sort),
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
        ({ uid, firstSeenAt, identityNamespace: _namespace, ...npc }) => ({
          ...npc,
          key: uid,
          firstSeenOn: toFirstSeenOn(firstSeenAt),
        }),
      ),
    } satisfies CatalogNpcsResponseDto_Output;
  });

  return { getItems, getNpcs };
};
