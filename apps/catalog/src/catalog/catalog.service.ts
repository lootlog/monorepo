import { BOSS_ORIGIN_ICON_DIRECTORIES } from "@lootlog/domain/npc-type";
import { Effect } from "effect";
import { maxBy, orderBy, pick, uniqBy } from "es-toolkit";
import type { Meilisearch, MultiSearchParams, SearchParams } from "meilisearch";
import { attemptMeilisearch } from "@lootlog/meilisearch/operation-failure";
import { buildMeilisearchInFilter } from "@lootlog/meilisearch/query-builder";
import type { DropSource } from "#src/items/item-drops";
import type { ItemDropRate } from "#src/items/items.service";
import { isElasticLevel } from "#src/items/item-levels";
import { collapseByNameAndType } from "#src/npcs/npcs.service";
import {
  earliestSeenByMonster,
  ITEMS_INDEX,
  NPCS_INDEX,
} from "#src/projection/catalog-indexes";
import {
  ELASTIC_LEVELS,
  elasticItemLevel,
} from "@lootlog/domain/elastic-level";
import {
  isEventEditionAvailableSince,
  itemEventLabels,
  itemEventSlug,
} from "@lootlog/domain/item-events";
import { itemStatValue } from "@lootlog/domain/item-stat";
import {
  itemAtLevel,
  itemStatAttackSpeed,
  upgradedAttackSpeed,
} from "@lootlog/domain/item-upgrade";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { CatalogMonsterLocation } from "@lootlog/protocol/rabbit/catalog";
import type { CatalogReads } from "#src/database/catalog-store";
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

const ITEM_TYPE = /^[A-Z_]+$/;

const CATALOG_KEY = /^[a-z]{2}(?:_[a-z]+)?_\d+_\d+$/;

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
  prof: string;
  type: CatalogNpcsResponseDto_Output["hits"][number]["type"];
  gameVersion: CatalogNpcsResponseDto_Output["hits"][number]["gameVersion"];
  locations?: ReadonlyArray<typeof CatalogMonsterLocation.Type>;
  formerLevels?: CatalogNpcsResponseDto_Output["hits"][number]["formerLevels"];
  current?: boolean;
  monsterKey: string;
  firstSeenAt?: number | null;
  monsterFirstSeenAt?: number | null;
};

const page = (query: { limit?: number; offset?: number }) => ({
  limit: Math.min(Math.max(Math.floor(query.limit ?? 24), 1), MAX_LIMIT),
  offset: Math.max(Math.floor(query.offset ?? 0), 0),
});

const toDropRate = (rate: ItemDropRate | undefined) =>
  rate?.rolls !== undefined && rate.basis && rate.lootMode
    ? {
        drops: rate.drops,
        kills: rate.kills,
        rolls: rate.rolls,
        basis: rate.basis,
        lootMode: rate.lootMode,
      }
    : null;

const sortBy = ({ sort, ids }: CatalogControllerGetItemsQuery) =>
  sort === undefined || sort === "relevance"
    ? ids?.length
      ? ["firstSeenAt:desc"]
      : undefined
    : [sort];

const ATTACK_SPEED_SORTS = new Map<
  CatalogControllerGetItemsQuery["sort"],
  (item: CatalogItemDocument) => number
>([
  ["attackSpeed:desc", (item) => itemStatAttackSpeed(item.stat)],
  ["upgradedAttackSpeed:desc", (item) => upgradedAttackSpeed(item)],
]);

const MAX_HITS = 1000;

const gameVersionFilter = (gameVersion: string | undefined) =>
  gameVersion === undefined
    ? undefined
    : `gameVersion = ${JSON.stringify(gameVersion)}`;

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

const inFilter = (
  field: string,
  values: ReadonlyArray<string | number> | undefined,
) => (values?.length ? buildMeilisearchInFilter(field, values) : undefined);

const itemFilters = (
  query: CatalogControllerGetItemsQuery,
  monsterKey: string | undefined,
) => {
  const types = query.types?.filter((type) => ITEM_TYPE.test(type));

  return [
    gameVersionFilter(query.gameVersion),
    inFilter("id", query.ids),
    inFilter("rarity", query.rarities),
    inFilter("type", types),
    inFilter("category", query.categories),
    inFilter("requiredProfessions", query.professions),
    levelFilter(query.minLevel, query.maxLevel),
    ...(query.statKeys ?? []).map(
      (key) => `statsKeys = ${JSON.stringify(key)}`,
    ),
    ...(query.excludedStatKeys ?? []).map(
      (key) => `NOT statsKeys = ${JSON.stringify(key)}`,
    ),
    inFilter("legendaryBonus", query.legendaryBonuses),
    inFilter("droppedByTypes", query.dropSourceTypes),
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

const NPC_FIELDS = [
  "uid",
  "id",
  "identityNamespace",
  "name",
  "icon",
  "lvl",
  "prof",
  "type",
  "gameVersion",
  "locations",
  "formerLevels",
  "current",
  "monsterKey",
  "monsterFirstSeenAt",
] as const satisfies ReadonlyArray<keyof CatalogNpcDocument>;

const toCatalogNpc = ({
  uid,
  identityNamespace: _namespace,
  current: _current,
  monsterKey: _monsterKey,
  monsterFirstSeenAt,
  locations,
  formerLevels,
  ...npc
}: CatalogNpcDocument) => ({
  ...npc,
  key: uid,
  firstSeenOn:
    monsterFirstSeenAt === undefined || monsterFirstSeenAt === null
      ? null
      : new Date(monsterFirstSeenAt).toISOString().slice(0, 10),
  locations: (locations ?? []).map(({ tiles, ...location }) => ({
    ...location,
    tiles: tiles ?? [],
  })),
  formerLevels: formerLevels ?? [],
});

export const makeCatalogModule = (
  meilisearch: Meilisearch,
  reads: CatalogReads<CatalogNpcDocument>,
) => {
  const logReadError =
    (message: string) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      effect.pipe(
        Effect.tapError((error) => Effect.logError(message, { error })),
      );

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
        Effect.logError("Catalog editions error", { error }),
      ),
    );

  const getItems = Effect.fn("Catalog.items")(function* (
    query: CatalogControllerGetItemsQuery,
  ) {
    if (
      (query.droppedBy !== undefined && !CATALOG_KEY.test(query.droppedBy)) ||
      (query.event !== undefined && !EVENT_SLUG.test(query.event))
    ) {
      return { hits: [], estimatedTotalHits: 0 };
    }

    const monsterKey =
      query.droppedBy === undefined
        ? undefined
        : yield* reads
            .monsterKeyOf(query.droppedBy)
            .pipe(logReadError("Catalog monster error"));

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
          Effect.logError("Catalog items error", { error }),
        ),
      );
    };

    const { limit, offset } = page(query);
    const attackSpeed = ATTACK_SPEED_SORTS.get(query.sort);

    const response = attackSpeed
      ? yield* Effect.all(
          [
            search({ offset: 0, limit: offset + limit, sort: sortBy(query) }, [
              "elasticLevel != true",
            ]),
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
      : yield* search({ offset, limit, sort: sortBy(query) });

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

  const npcOrder = (sort: CatalogControllerGetNpcsQuery["sort"]) => {
    if (sort?.startsWith("name:")) return [sort];

    return [
      sort === "firstSeenOn:desc"
        ? "monsterFirstSeenAt:desc"
        : (sort ?? "lvl:desc"),
      "name:asc",
    ];
  };

  const firstSeenMonthFilter = ({
    firstSeenMonth,
  }: CatalogControllerGetNpcsQuery) => {
    if (firstSeenMonth === undefined) return undefined;

    const [year = 0, month = 1] = firstSeenMonth.split("-").map(Number);

    return `monsterFirstSeenAt >= ${Date.UTC(year, month - 1)} AND monsterFirstSeenAt < ${Date.UTC(year, month)}`;
  };

  const bossOriginFilter = ({ bossOrigins }: CatalogControllerGetNpcsQuery) => {
    if (!bossOrigins?.length) return undefined;

    const asked = new Set<string>(bossOrigins);

    const bosses = Object.entries(BOSS_ORIGIN_ICON_DIRECTORIES).flatMap(
      ([type, directories]) => {
        const owned = Object.entries(directories);

        const origins = [
          ...owned
            .filter(([origin]) => asked.has(origin))
            .map(
              ([, directory]) => `iconDirectory = ${JSON.stringify(directory)}`,
            ),
          ...(asked.has("EVENT")
            ? [
                `iconDirectory NOT IN ${JSON.stringify(owned.map(([, directory]) => directory))}`,
              ]
            : []),
        ];

        return origins.length > 0
          ? [`(type = ${JSON.stringify(type)} AND (${origins.join(" OR ")}))`]
          : [];
      },
    );

    const bossTypes = JSON.stringify(Object.keys(BOSS_ORIGIN_ICON_DIRECTORIES));

    return `(${[`type NOT IN ${bossTypes}`, ...bosses].join(" OR ")})`;
  };

  const npcLevelFilter = ({
    minLevel,
    maxLevel,
  }: CatalogControllerGetNpcsQuery) => {
    if (minLevel === undefined && maxLevel === undefined) return undefined;

    return [
      `lvl >= ${Math.max(Math.floor(minLevel ?? 1), 1)}`,
      ...(maxLevel === undefined ? [] : [`lvl <= ${Math.floor(maxLevel)}`]),
    ].join(" AND ");
  };

  const npcsByKeys = Effect.fn("Catalog.npcsByKeys")(function* (
    keys: ReadonlyArray<string>,
    query: CatalogControllerGetNpcsQuery,
  ) {
    const found = orderBy(
      (yield* reads.npcsByUids(keys)).filter(
        (npc) =>
          (query.gameVersion === undefined ||
            npc.gameVersion === query.gameVersion) &&
          (!query.ids?.length || query.ids.includes(npc.id)) &&
          (!query.types?.length || query.types.includes(npc.type)),
      ),
      [({ lvl }) => lvl, ({ name }) => name],
      ["desc", "asc"],
    );

    const { limit, offset } = page(query);
    const listed = found.slice(offset, offset + limit);

    const identities =
      listed.length === 0
        ? []
        : yield* reads.npcsByMonsterKeys([
            ...new Set(listed.map(({ monsterKey }) => monsterKey)),
          ]);

    const superseded = new Set(
      listed.flatMap(({ current, monsterKey }) =>
        current === false ? [monsterKey] : [],
      ),
    );

    const currentIdentities = orderBy(
      identities.filter(
        ({ current, monsterKey }) =>
          current !== false && superseded.has(monsterKey),
      ),
      [({ lvl }) => lvl, ({ name }) => name],
      ["desc", "asc"],
    );

    const monsterFirstSeen = earliestSeenByMonster(identities);

    return {
      estimatedTotalHits: found.length,
      hits: collapseByNameAndType([...listed, ...currentIdentities]).map(
        (npc) =>
          toCatalogNpc({
            ...pick(npc, NPC_FIELDS),
            monsterFirstSeenAt: monsterFirstSeen.get(npc.monsterKey) ?? null,
          }),
      ),
    } satisfies CatalogNpcsResponseDto_Output;
  });

  const getNpcs = Effect.fn("Catalog.npcs")(function* (
    query: CatalogControllerGetNpcsQuery,
  ) {
    if (query.keys !== undefined) {
      const keys = query.keys.filter((key) => CATALOG_KEY.test(key));

      return keys.length === 0
        ? { hits: [], estimatedTotalHits: 0 }
        : yield* npcsByKeys(keys, query).pipe(
            logReadError("Catalog NPC keys error"),
          );
    }

    const lookup = Boolean(query.ids?.length);

    const filters = [
      gameVersionFilter(query.gameVersion),
      query.ids?.length ? buildMeilisearchInFilter("id", query.ids) : undefined,
      lookup ? undefined : "current != false",
      query.types?.length
        ? buildMeilisearchInFilter("type", query.types)
        : undefined,
      bossOriginFilter(query),
      npcLevelFilter(query),
      firstSeenMonthFilter(query),
    ].filter((filter) => filter !== undefined);

    const params: SearchParams = {
      ...page(query),
      attributesToRetrieve: [...NPC_FIELDS],
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      distinct: lookup ? undefined : "monsterKey",
      sort: npcOrder(query.sort),
    };

    const search = (searchParams: SearchParams) =>
      attemptMeilisearch("catalog.npcs", () =>
        meilisearch
          .index<CatalogNpcDocument>(NPCS_INDEX)
          .search(query.search ?? "", searchParams),
      ).pipe(logReadError("Catalog NPCs error"));

    const response = yield* search(params);

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
        toCatalogNpc,
      ),
    } satisfies CatalogNpcsResponseDto_Output;
  });

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
        Effect.logError("Catalog events error", { error }),
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

  const getIndex = Effect.fn("Catalog.index")(function* (
    query: CatalogControllerGetIndexQuery,
  ) {
    const [items, npcs] = yield* Effect.all(
      [
        reads.itemNames(query.gameVersion),
        reads.currentNpcNames(query.gameVersion),
      ],
      { concurrency: 2 },
    ).pipe(logReadError("Catalog index error"));

    return {
      items,
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
