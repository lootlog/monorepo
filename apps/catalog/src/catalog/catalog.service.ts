import { Effect } from "effect";
import { maxBy, orderBy, uniqBy } from "es-toolkit";
import type { Meilisearch, MultiSearchParams, SearchParams } from "meilisearch";
import { attemptMeilisearch } from "@lootlog/meilisearch/operation-failure";
import { buildMeilisearchInFilter } from "@lootlog/meilisearch/query-builder";
import { ITEMS_INDEX } from "#src/items/search-index";
import type { DropSource } from "#src/items/item-drops";
import type { ItemDropRate } from "#src/items/items.service";
import { isElasticLevel } from "#src/items/item-levels";
import { collapseByNameAndType } from "#src/npcs/npcs.service";
import { NPCS_INDEX } from "#src/npcs/search-index";
import {
  ELASTIC_LEVELS,
  elasticItemLevel,
} from "@lootlog/domain/elastic-level";
import {
  isEventEditionAvailableSince,
  itemEventLabels,
  itemEventSlug,
} from "@lootlog/domain/item-events";
import {
  itemAtLevel,
  itemStatAttackSpeed,
  itemStatValue,
  upgradedAttackSpeed,
} from "@lootlog/domain/item-upgrade";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { AppLogger } from "#src/shared/logger";
import type {
  CatalogControllerGetEventsQuery,
  CatalogControllerGetIndexQuery,
  CatalogControllerGetItemsQuery,
  CatalogControllerGetNpcsQuery,
  CatalogEventsResponseDto_Output,
  CatalogIndexResponseDto_Output,
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
  dropRates?: ItemDropRate[];
  revisions?: CatalogItemsResponseDto_Output["hits"][number]["revisions"];
  observedLevels?: number[];
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
  locations?: CatalogNpcsResponseDto_Output["hits"][number]["locations"];
  formerLevels?: CatalogNpcsResponseDto_Output["hits"][number]["formerLevels"];
  current?: boolean;
  monsterKey: string;
};

const page = (query: { limit?: number; offset?: number }) => ({
  limit: Math.min(Math.max(Math.floor(query.limit ?? 24), 1), MAX_LIMIT),
  offset: Math.max(Math.floor(query.offset ?? 0), 0),
});

const toDropRate = (rate: ItemDropRate | undefined) =>
  rate ? { drops: rate.drops, kills: rate.kills } : null;

const sortBy = (sort: CatalogControllerGetItemsQuery["sort"]) =>
  sort === undefined || sort === "relevance" ? undefined : [sort];

/** The sorts that rank by the attack speed an item adds, and how they count it. */
const ATTACK_SPEED_SORTS = new Map<
  CatalogControllerGetItemsQuery["sort"],
  (item: CatalogItemDocument) => number
>([
  ["attackSpeed:desc", (item) => itemStatAttackSpeed(item.stat)],
  ["upgradedAttackSpeed:desc", (item) => upgradedAttackSpeed(item)],
]);

// How many documents the catalog index reads at a time.
const INDEX_BATCH_SIZE = 5000;

// The most hits one Meilisearch search returns, its `maxTotalHits`.
const MAX_HITS = 1000;

const gameVersionFilter = (gameVersion: string | undefined) =>
  gameVersion === undefined
    ? undefined
    : `gameVersion = ${JSON.stringify(gameVersion)}`;

/**
 * Items of a level range. An elastic item comes at any level Margonem gives
 * it, so it matches every range reaching into those levels.
 */
const levelFilter = (min: number | undefined, max: number | undefined) => {
  const bounds = [
    min === undefined ? undefined : `lvl >= ${Math.floor(min)}`,
    max === undefined ? undefined : `lvl <= ${Math.floor(max)}`,
  ].filter((bound) => bound !== undefined);

  if (bounds.length === 0) return undefined;

  const reachesElastic =
    (max ?? ELASTIC_LEVELS.max) >= ELASTIC_LEVELS.min &&
    (min ?? ELASTIC_LEVELS.min) <= ELASTIC_LEVELS.max;

  return reachesElastic
    ? `((${bounds.join(" AND ")}) OR elasticLevel = true)`
    : bounds.join(" AND ");
};

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
    levelFilter(query.minLevel, query.maxLevel),
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

  /**
   * Items a world opened on `since` has: those of no event, and those of an
   * edition it saw. An item that came back keeps any edition it saw, so the
   * filter names the editions to keep rather than those to leave out.
   */
  const availabilityFilter = (gameVersion: string | undefined, since: string) =>
    attemptMeilisearch("catalog.items.editions", () =>
      meilisearch.index(ITEMS_INDEX).search("", {
        filter: [gameVersionFilter(gameVersion), `statsKeys = "etiquette"`]
          .filter((filter) => filter !== undefined)
          .join(" AND "),
        facets: ["eventSlugs"],
        limit: 0,
      }),
    ).pipe(
      Effect.map(({ facetDistribution }) => {
        const seen = Object.keys(facetDistribution?.eventSlugs ?? {}).filter(
          (slug) => isEventEditionAvailableSince(slug, since),
        );

        return seen.length === 0
          ? `NOT statsKeys = "etiquette"`
          : `(NOT statsKeys = "etiquette" OR ${buildMeilisearchInFilter("eventSlugs", seen)})`;
      }),
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Catalog editions error", { error })),
      ),
    );

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

    const availability =
      query.availableSince === undefined
        ? undefined
        : yield* availabilityFilter(query.gameVersion, query.availableSince);

    const filters = [
      ...itemFilters(query, monsterKey),
      ...(availability === undefined ? [] : [availability]),
    ];

    const params: SearchParams = {
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
        "dropRates",
        "revisions",
        "observedLevels",
      ],
    };

    const search = (extra: SearchParams, extraFilters: string[] = []) => {
      const all = [...filters, ...extraFilters];

      return attemptMeilisearch("catalog.items", () =>
        meilisearch
          .index<CatalogItemDocument>(ITEMS_INDEX)
          .search(query.search ?? "", {
            ...params,
            ...extra,
            filter: all.length > 0 ? all.join(" AND ") : undefined,
          }),
      ).pipe(
        Effect.map((response) => ({
          hits: response.hits,
          total: response.estimatedTotalHits ?? response.hits.length,
        })),
        Effect.tapError((error) =>
          Effect.sync(() => logger.error("Catalog items error", { error })),
        ),
      );
    };

    const { limit, offset } = page(query);
    const attackSpeed = ATTACK_SPEED_SORTS.get(query.sort);

    // An elastic item's stats follow its looter's level, and the index holds
    // the version it saw last, so its attack speed is counted at the level
    // the search is capped to, as the wiki shows it, and merged into the
    // fixed items in Meilisearch's order, which puts a query's relevance
    // before speed.
    const response = attackSpeed
      ? yield* Effect.all(
          [
            search(
              { offset: 0, limit: offset + limit, sort: sortBy(query.sort) },
              ["elasticLevel != true"],
            ),
            search({ offset: 0, limit: MAX_HITS }, ["elasticLevel = true"]),
          ],
          { concurrency: "unbounded" },
        ).pipe(
          Effect.map(([fixed, elastic]) => {
            const level = query.maxLevel ?? ELASTIC_LEVELS.max;

            const elasticRanked = elastic.hits
              .map((hit) => ({
                hit,
                value: attackSpeed(
                  itemAtLevel(hit, elasticItemLevel(hit.type, level)),
                ),
              }))
              .sort((a, b) => b.value - a.value);

            const merged: CatalogItemDocument[] = [];
            let next = 0;

            for (const hit of fixed.hits) {
              const value = attackSpeed(hit);
              let faster = elasticRanked[next];

              while (faster && faster.value > value) {
                merged.push(faster.hit);
                next += 1;
                faster = elasticRanked[next];
              }

              merged.push(hit);
            }

            merged.push(...elasticRanked.slice(next).map(({ hit }) => hit));

            return {
              total: fixed.total + elastic.total,
              hits: merged.slice(offset, offset + limit),
            };
          }),
        )
      : yield* search({ offset, limit, sort: sortBy(query.sort) });

    return {
      estimatedTotalHits: response.total,
      hits: response.hits.map(
        ({
          droppedBy,
          retiredDropMonsterKeys,
          dropRates,
          revisions,
          observedLevels,
          ...item
        }) => ({
          ...item,
          revisions: revisions ?? [],
          elasticLevel: isElasticLevel({ observedLevels }),
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
              dropRate: toDropRate(
                dropRates?.find((rate) => rate.monsterKey === monsterKey),
              ),
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

    const lookup = Boolean(query.ids?.length || keys?.length);

    const filters = [
      gameVersionFilter(query.gameVersion),
      query.ids?.length ? buildMeilisearchInFilter("id", query.ids) : undefined,
      keys?.length ? buildMeilisearchInFilter("uid", keys) : undefined,
      // A listing shows each monster as it is now; a lookup also finds the
      // identities of its earlier versions. Entries indexed before the flag
      // existed have none and count as current.
      lookup ? undefined : "current != false",
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
        "locations",
        "formerLevels",
        "current",
        "monsterKey",
      ],
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      // Pages and counts are over monsters, not over their catalog identities.
      // A lookup reads every identity it names, so the current one is chosen
      // below rather than the highest level.
      distinct: lookup ? undefined : "monsterKey",
      // Without a query Meilisearch returns documents in storage order; a
      // query still ranks by relevance before this. Strongest first keeps
      // level-less objects at the end.
      sort: ["lvl:desc", "name:asc"],
    };

    const search = (searchParams: SearchParams) =>
      attemptMeilisearch("catalog.npcs", () =>
        meilisearch
          .index<CatalogNpcDocument>(NPCS_INDEX)
          .search(query.search ?? "", searchParams),
      ).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => logger.error("Catalog NPCs error", { error })),
        ),
      );

    const response = yield* search(params);

    // An old link can name only a monster's former identity; its current
    // identity, under another id, shows the monster as it is now.
    const superseded = [
      ...new Set(
        response.hits.flatMap(({ current, monsterKey }) =>
          current === false ? [monsterKey] : [],
        ),
      ),
    ];

    const currentIdentities =
      lookup && superseded.length > 0
        ? (yield* search({
            ...params,
            offset: 0,
            limit: MAX_LIMIT,
            filter: [
              buildMeilisearchInFilter("monsterKey", superseded),
              "current != false",
            ].join(" AND "),
          })).hits
        : [];

    return {
      estimatedTotalHits: response.estimatedTotalHits ?? response.hits.length,
      hits: collapseByNameAndType([...response.hits, ...currentIdentities]).map(
        ({
          uid,
          identityNamespace: _namespace,
          current: _current,
          monsterKey: _monsterKey,
          locations,
          formerLevels,
          ...npc
        }) => ({
          ...npc,
          key: uid,
          locations: locations ?? [],
          formerLevels: formerLevels ?? [],
        }),
      ),
    } satisfies CatalogNpcsResponseDto_Output;
  });

  /**
   * Every event with items in the catalog: Meilisearch counts the items of
   * each event slug, and each event's highest-level item gives its name as
   * the game writes it and the monster that pictures it.
   */
  const getEvents = Effect.fn("Catalog.events")(function* (
    query: CatalogControllerGetEventsQuery,
  ) {
    const filters = [
      gameVersionFilter(query.gameVersion),
      `statsKeys = "etiquette"`,
    ].filter((filter) => filter !== undefined);

    const counts = yield* attemptMeilisearch("catalog.events.counts", () =>
      meilisearch.index(ITEMS_INDEX).search("", {
        filter: filters.join(" AND "),
        facets: ["eventSlugs"],
        limit: 0,
      }),
    ).pipe(
      Effect.map(({ facetDistribution }) =>
        Object.entries(facetDistribution?.eventSlugs ?? {}),
      ),
    );

    if (counts.length === 0) return { events: [] };

    const { results } = yield* attemptMeilisearch("catalog.events.items", () =>
      meilisearch.multiSearch<
        MultiSearchParams,
        Pick<CatalogItemDocument, "stat" | "droppedBy">
      >({
        queries: counts.map(([slug]) => ({
          indexUid: ITEMS_INDEX,
          q: "",
          filter: [...filters, `eventSlugs = ${JSON.stringify(slug)}`].join(
            " AND ",
          ),
          sort: ["lvl:desc"],
          limit: 1,
          attributesToRetrieve: ["stat", "droppedBy"],
        })),
      }),
    ).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Catalog events error", { error })),
      ),
    );

    const events = counts.flatMap(([slug, itemCount], index) => {
      const item = results[index]?.hits[0];

      const name = itemEventLabels(
        itemStatValue(item?.stat ?? "", "etiquette") ?? "",
      ).find((label) => itemEventSlug(label) === slug);

      if (!name) return [];

      const boss = maxBy(item?.droppedBy ?? [], ({ lvl }) => lvl ?? 0);
      const year = /\b(\d{4})\b/.exec(name)?.[1];

      return [
        {
          slug,
          name,
          year: year === undefined ? null : Number(year),
          itemCount,
          boss: boss ? { name: boss.name, icon: boss.icon } : null,
        },
      ];
    });

    return {
      events: orderBy(
        events,
        [({ year }) => year ?? 0, ({ name }) => name],
        ["desc", "asc"],
      ),
    } satisfies CatalogEventsResponseDto_Output;
  });

  /**
   * Every item and current NPC by id and name. Searches stop at Meilisearch's
   * `maxTotalHits`, so the documents are read in batches instead.
   */
  const getIndex = Effect.fn("Catalog.index")(function* (
    query: CatalogControllerGetIndexQuery,
  ) {
    const readAll = <Document extends Record<string, unknown>>(
      index: string,
      filter: string | undefined,
      fields: Array<Extract<keyof Document, string>>,
    ) =>
      Effect.gen(function* () {
        const documents: Document[] = [];

        for (;;) {
          const batch = yield* attemptMeilisearch("catalog.index", () =>
            meilisearch.index<Document>(index).getDocuments({
              filter,
              fields,
              limit: INDEX_BATCH_SIZE,
              offset: documents.length,
            }),
          );

          documents.push(...batch.results);

          if (batch.results.length < INDEX_BATCH_SIZE) return documents;
        }
      });

    const gameVersion = gameVersionFilter(query.gameVersion);

    const [items, npcs] = yield* Effect.all(
      [
        readAll<Pick<CatalogItemDocument, "id" | "name">>(
          ITEMS_INDEX,
          gameVersion,
          ["id", "name"],
        ),
        readAll<
          Pick<
            CatalogNpcDocument,
            | "id"
            | "name"
            | "type"
            | "gameVersion"
            | "identityNamespace"
            | "current"
          >
        >(
          NPCS_INDEX,
          [gameVersion, "current != false"]
            .filter((filter) => filter !== undefined)
            .join(" AND "),
          ["id", "name", "type", "gameVersion", "identityNamespace", "current"],
        ),
      ],
      { concurrency: 2 },
    ).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Catalog index error", { error })),
      ),
    );

    // An item id may have several versions; its page shows the first stored,
    // as this reads them. One NPC id may name several monsters.
    return {
      items: orderBy(
        uniqBy(items, ({ id }) => id).map(({ id, name }) => ({ id, name })),
        ["id"],
        ["asc"],
      ),
      npcs: orderBy(
        uniqBy(
          collapseByNameAndType(npcs),
          ({ id, name }) => `${id}|${name}`,
        ).map(({ id, name }) => ({ id, name })),
        ["id"],
        ["asc"],
      ),
    } satisfies CatalogIndexResponseDto_Output;
  });

  return { getItems, getNpcs, getEvents, getIndex };
};
