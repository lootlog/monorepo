import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeCatalogModule } from "./catalog.service.js";

const logger = { info() {}, warn() {}, error() {} };

/**
 * A Meilisearch that answers item searches with `hits`, a search for elastic
 * items alone with `elasticHits`, and NPC searches with what `npcs` returns
 * for the search's filter.
 */
const catalogWith = (
  hits: unknown[],
  npcs: (filter: string | undefined) => unknown[] = () => [],
  elasticHits: unknown[] = [],
) => {
  const searches: Array<{ filter?: string; attributesToRetrieve?: string[] }> =
    [];

  const npcSearches: Array<{
    filter?: string;
    attributesToRetrieve?: string[];
    distinct?: string;
  }> = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const isNpcSearch = String(input).includes("/indexes/catalog_npcs/");
      const body = JSON.parse(String(init?.body));

      const results = isNpcSearch
        ? npcs(body.filter)
        : String(body.filter).endsWith("AND elasticLevel = true")
          ? elasticHits
          : hits;

      (isNpcSearch ? npcSearches : searches).push(body);

      return Promise.resolve({
        hits: results,
        estimatedTotalHits: results.length,
      });
    },
  });

  return { catalog: makeCatalogModule(client, logger), searches, npcSearches };
};

const nosferatu = {
  key: "pl_template_7001_2",
  monsterKey: "pl_Nosferatu_HERO",
  id: 7001,
  name: "Nosferatu",
  lvl: 120,
  icon: "nosferatu.gif",
  type: "HERO",
};

const stored = (
  source: typeof nosferatu,
  identityNamespace: "template" | "runtime",
) => ({ ...source, identityNamespace, gameVersion: "pl" });

const kostucha = {
  key: "pl_template_7002_2",
  monsterKey: "pl_Kostucha_HERO",
  id: 7002,
  name: "Kostucha",
  lvl: 140,
  icon: "kostucha.gif",
  type: "HERO",
};

test("lists a monster's drops from any of its identities, marking the monsters that no longer drop them and each one's drop rate, without worlds or when Lootlog first saw them", async () => {
  const { catalog, searches } = catalogWith(
    [
      {
        id: 1,
        name: "Kieł Nosferatu",
        icon: "kiel.gif",
        stat: "",
        lvl: 120,
        rarity: "LEGENDARY",
        type: "ONE_HAND_WEAPON",
        // The same boss as seen by an older client and by a current one.
        droppedBy: [
          stored(
            { ...nosferatu, key: "pl_runtime_9001_2", id: 9001 },
            "runtime",
          ),
          stored(nosferatu, "template"),
          stored(kostucha, "template"),
        ],
        retiredDropMonsterKeys: [nosferatu.monsterKey],
        dropRates: [{ monsterKey: kostucha.monsterKey, drops: 9, kills: 600 }],
      },
    ],
    () => [{ monsterKey: nosferatu.monsterKey }],
  );

  const response = await Effect.runPromise(
    catalog.getItems({
      droppedBy: "pl_runtime_9001_2",
      rarities: ["LEGENDARY"],
      sort: "lvl:desc",
    }),
  );

  expect(response.hits).toEqual([
    expect.objectContaining({
      name: "Kieł Nosferatu",
      droppedBy: [
        {
          key: "pl_template_7001_2",
          id: 7001,
          name: "Nosferatu",
          lvl: 120,
          icon: "nosferatu.gif",
          type: "HERO",
          retired: true,
          dropRate: null,
        },
        {
          key: "pl_template_7002_2",
          id: 7002,
          name: "Kostucha",
          lvl: 140,
          icon: "kostucha.gif",
          type: "HERO",
          retired: false,
          dropRate: { drops: 9, kills: 600 },
        },
      ],
    }),
  ]);
  expect(searches[0]).toMatchObject({
    filter:
      'rarity IN ["LEGENDARY"] AND droppedByMonsterKeys = "pl_Nosferatu_HERO"',
    sort: ["lvl:desc"],
  });
  // A first sighting dates a boss kill, and so its respawn.
  expect(searches[0]?.attributesToRetrieve).not.toContain("worlds");
  expect(searches[0]?.attributesToRetrieve).not.toContain("firstSeenAt");
});

test("marks an item seen at its looters' levels as elastic, but not one rebalanced a few times", async () => {
  const hit = (id: number) => ({
    id,
    name: `Item ${id}`,
    icon: "item.gif",
    stat: "",
    lvl: 40,
    rarity: "LEGENDARY",
    type: "GLOVES",
    droppedBy: [],
  });

  const { catalog } = catalogWith([
    { ...hit(1), observedLevels: [40, 42, 47, 52, 57] },
    { ...hit(2), observedLevels: [40, 45, 50, 60] },
    // Indexed before levels were collected.
    hit(3),
  ]);

  const response = await Effect.runPromise(catalog.getItems({}));

  expect(
    response.hits.map(({ id, elasticLevel }) => ({ id, elasticLevel })),
  ).toEqual([
    { id: 1, elasticLevel: true },
    { id: 2, elasticLevel: false },
    { id: 3, elasticLevel: false },
  ]);
  expect(response.hits[0]).not.toHaveProperty("observedLevels");
});

test("a level range also finds elastic items, which come at any level from 40 to 300", async () => {
  const { catalog, searches } = catalogWith([]);

  for (const query of [
    { minLevel: 50, maxLevel: 60 },
    { maxLevel: 30 },
    { minLevel: 301 },
  ]) {
    await Effect.runPromise(catalog.getItems(query));
  }

  expect(searches.map(({ filter }) => filter)).toEqual([
    "((lvl >= 50 AND lvl <= 60) OR elasticLevel = true)",
    // No elastic item is below 40 or above 300.
    "lvl <= 30",
    "lvl >= 301",
  ]);
});

test("a malformed NPC key or event slug matches nothing instead of reaching the filter", async () => {
  const { catalog, searches } = catalogWith([]);

  for (const query of [
    { droppedBy: 'x" OR rarity EXISTS OR "' },
    { event: 'wakacje-2026" OR rarity EXISTS OR "' },
  ]) {
    const response = await Effect.runPromise(catalog.getItems(query));

    expect(response).toEqual({ hits: [], estimatedTotalHits: 0 });
  }

  expect(searches).toEqual([]);
});

test("an old link to a rebalanced monster's former identity shows the monster as it is now, and listings show only current identities", async () => {
  const reuzen = {
    gameVersion: "pl",
    monsterKey: "pl_Reuzen_COLOSSUS",
    name: "Reuzen",
    icon: "reuzen.gif",
    type: "COLOSSUS",
  };

  // The old link's id names only the entry from before the rebalance; the
  // current one has another id.
  const { catalog, npcSearches } = catalogWith([], (filter) =>
    filter?.includes("monsterKey IN")
      ? [
          {
            ...reuzen,
            id: 306076,
            uid: "pl_template_306076_2",
            identityNamespace: "template",
            lvl: 244,
            current: true,
          },
        ]
      : [
          {
            ...reuzen,
            id: 173652,
            uid: "pl_173652_2",
            identityNamespace: "legacy",
            lvl: 252,
            current: false,
          },
        ],
  );

  const found = await Effect.runPromise(
    catalog.getNpcs({ gameVersion: "pl", ids: [173652] }),
  );

  expect(found.hits).toEqual([
    expect.objectContaining({ key: "pl_template_306076_2", lvl: 244 }),
  ]);
  expect(npcSearches[0]).toMatchObject({
    filter: 'gameVersion = "pl" AND id IN [173652]',
  });
  expect(npcSearches[0]?.distinct).toBeUndefined();
  expect(npcSearches[0]?.attributesToRetrieve).not.toContain("firstSeenAt");
  expect(npcSearches[1]?.filter).toBe(
    'monsterKey IN ["pl_Reuzen_COLOSSUS"] AND current != false',
  );

  await Effect.runPromise(
    catalog.getNpcs({ gameVersion: "pl", types: ["COLOSSUS"] }),
  );

  // A rebalanced colossus is listed at its level now, not its former one.
  expect(npcSearches[2]?.filter).toBe(
    'gameVersion = "pl" AND current != false AND type IN ["COLOSSUS"]',
  );
});

test("narrows items to one edition's event drops of a kind of boss that carry the required stats and bonuses and lack the excluded ones", async () => {
  const { catalog, searches } = catalogWith([]);

  await Effect.runPromise(
    catalog.getItems({
      gameVersion: "pl",
      statKeys: ["legbon", "crit"],
      excludedStatKeys: ["etiquette"],
      legendaryBonuses: ["verycrit", "curse"],
      dropSourceTypes: ["TITAN"],
      event: "wakacje-2026",
    }),
  );

  expect(searches[0]?.filter).toBe(
    `gameVersion = "pl" AND statsKeys = "legbon" AND statsKeys = "crit" AND NOT statsKeys = "etiquette" AND legendaryBonus IN ["verycrit", "curse"] AND droppedByTypes IN ["TITAN"] AND eventSlugs = "wakacje-2026"`,
  );
});

test("a world's search keeps items of no event and of the editions it saw, including items that came back", async () => {
  const searches: Array<{ filter?: string; facets?: string[] }> = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (_input, init) => {
      const body = JSON.parse(String(init?.body));

      searches.push(body);

      return Promise.resolve({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {
          eventSlugs: {
            "wielkanoc-2026": 3,
            "noc-kupaly-2026": 2,
            "wakacje-2021": 4,
            "wakacje-2026": 5,
            "dzien-mlodego-smoka": 6,
          },
        },
      });
    },
  });

  await Effect.runPromise(
    makeCatalogModule(client, logger).getItems({
      gameVersion: "pl",
      availableSince: "2026-06-29",
    }),
  );

  expect(searches.at(-1)?.filter).toBe(
    `gameVersion = "pl" AND (NOT statsKeys = "etiquette" OR eventSlugs IN ["wakacje-2026", "dzien-mlodego-smoka"])`,
  );
});

test("ranks an elastic item by its attack speed at the searched level, not the one the index last saw", async () => {
  const armor = (id: number, lvl: number, sa: number) => ({
    id,
    name: `Zbroja ${id}`,
    icon: "zbroja.gif",
    stat: `lvl=${lvl};sa=${sa}`,
    lvl,
    rarity: "LEGENDARY",
    type: "ARMOR",
  });

  // Three attack speed bonuses: 2,31 SA at 297, 0,55 at 62.
  const elastic = {
    ...armor(1, 297, 231),
    observedLevels: [42, 47, 52, 57, 62],
  };

  const fixed = [armor(2, 60, 82), armor(3, 50, 40)];

  const { catalog } = catalogWith(fixed, undefined, [elastic]);

  const response = await Effect.runPromise(
    catalog.getItems({
      types: ["ARMOR"],
      maxLevel: 64,
      sort: "attackSpeed:desc",
      limit: 2,
    }),
  );

  expect(response.hits.map(({ id }) => id)).toEqual([2, 1]);
  expect(response.estimatedTotalHits).toBe(3);
});

test("keeps a query's relevance order among fixed items when it merges in elastic ones", async () => {
  const armor = (id: number, lvl: number, sa: number) => ({
    id,
    name: `Zbroja ${id}`,
    icon: "zbroja.gif",
    stat: `lvl=${lvl};sa=${sa}`,
    lvl,
    rarity: "LEGENDARY",
    type: "ARMOR",
  });

  // 0,55 SA at 62.
  const elastic = {
    ...armor(1, 297, 231),
    observedLevels: [42, 47, 52, 57, 62],
  };

  // Meilisearch ranks the better name match first, then speed.
  const { catalog } = catalogWith(
    [armor(3, 50, 40), armor(2, 60, 82)],
    undefined,
    [elastic],
  );

  const response = await Effect.runPromise(
    catalog.getItems({
      search: "zbroja",
      types: ["ARMOR"],
      maxLevel: 64,
      sort: "attackSpeed:desc",
    }),
  );

  expect(response.hits.map(({ id }) => id)).toEqual([1, 3, 2]);
});

test("events take their name from the year the slug names, the latest first", async () => {
  const pumpkinBoots = {
    stat: "etiquette=Halloween 2025 r.|Halloween 2026 r.;lvl=112",
    droppedBy: [
      { ...nosferatu, lvl: 90, name: "Dynia", icon: "dynia.gif" },
      nosferatu,
    ],
  };

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const body = JSON.parse(String(init?.body));

      if (String(input).endsWith("/multi-search")) {
        return Promise.resolve({
          results: body.queries.map(() => ({ hits: [pumpkinBoots] })),
        });
      }

      return Promise.resolve({
        hits: [],
        facetDistribution: {
          eventSlugs: { "halloween-2025": 6, "halloween-2026": 7 },
        },
      });
    },
  });

  const { events } = await Effect.runPromise(
    makeCatalogModule(client, logger).getEvents({ gameVersion: "pl" }),
  );

  expect(events).toEqual([
    {
      slug: "halloween-2026",
      name: "Halloween 2026 r.",
      year: 2026,
      itemCount: 7,
      boss: { name: "Nosferatu", icon: "nosferatu.gif" },
    },
    {
      slug: "halloween-2025",
      name: "Halloween 2025 r.",
      year: 2025,
      itemCount: 6,
      boss: { name: "Nosferatu", icon: "nosferatu.gif" },
    },
  ]);
});

test("the index reads every document past one batch, each item and monster once", async () => {
  const fetches: Array<{ index: string; offset: number; filter?: string }> = [];

  // Item 1 comes twice, as a renamed version is stored after the first.
  const items = [
    ...Array.from({ length: 5001 }, (_, index) => ({
      id: 5001 - index,
      name: `Item ${5001 - index}`,
    })),
    { id: 1, name: "Renamed item 1" },
  ];

  const npcs = [
    {
      id: 2,
      name: "Tanroth",
      type: "HERO",
      gameVersion: "pl",
      identityNamespace: "runtime",
    },
    {
      id: 1,
      name: "Tanroth",
      type: "HERO",
      gameVersion: "pl",
      identityNamespace: "template",
    },
  ];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const body = JSON.parse(String(init?.body));

      const index = String(input).includes("/indexes/catalog_npcs/")
        ? "npcs"
        : "items";

      const documents = index === "npcs" ? npcs : items;

      fetches.push({ index, offset: body.offset, filter: body.filter });

      return Promise.resolve({
        results: documents.slice(body.offset, body.offset + body.limit),
        offset: body.offset,
        limit: body.limit,
        total: documents.length,
      });
    },
  });

  const index = await Effect.runPromise(
    makeCatalogModule(client, logger).getIndex({ gameVersion: "pl" }),
  );

  expect(index.items).toHaveLength(5001);
  expect(index.items[0]).toEqual({ id: 1, name: "Item 1" });
  expect(index.npcs).toEqual([{ id: 1, name: "Tanroth" }]);
  expect(fetches.find(({ index }) => index === "npcs")?.filter).toBe(
    'gameVersion = "pl" AND current != false',
  );
});
