import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { Meilisearch } from "meilisearch";
import pg from "pg";
import { makeCatalogModule } from "#src/catalog/catalog.service";
import { makeCatalogStore } from "#src/database/catalog-store";
import { CatalogDatabase } from "#src/database/database";
import { migrateCatalogDatabase } from "#src/database/migrate";
import {
  itemCatalogKey,
  type ItemEntry,
  makeItemsModule,
} from "#src/items/items.service";
import {
  makeNpcsModule,
  npcCatalogKey,
  type NpcEntry,
} from "#src/npcs/npcs.service";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";

const logger = { info() {}, warn() {}, error() {} };

let postgres: StartedPostgreSqlContainer;

let pool: pg.Pool;

let runtime: ManagedRuntime.ManagedRuntime<CatalogDatabase, unknown>;

/** What the search index received, per index and entry. */
let projected: Map<string, Map<string, object>>;

let projectionWrites: number;

let failProjection: boolean;

const meilisearch = new Meilisearch({
  host: "http://search.invalid",
  httpClient: (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.startsWith("/tasks/"))
      return Promise.resolve({ uid: 1, status: "succeeded" });

    if (failProjection) return Promise.reject(new Error("search is down"));

    const indexName = url.pathname.split("/")[2] ?? "";
    const index = projected.get(indexName) ?? new Map();

    for (const document of JSON.parse(String(init?.body))) {
      index.set(document.uid, document);
    }

    projected.set(indexName, index);
    projectionWrites += 1;

    return Promise.resolve({ taskUid: 1, status: "enqueued" });
  },
});

beforeAll(async () => {
  postgres = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("catalog")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .withStartupTimeout(60_000)
    .start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });

  const postgresLayer = makePostgresLayer({
    url: Redacted.make(postgres.getConnectionUri()),
  });

  await Effect.runPromise(
    migrateCatalogDatabase.pipe(Effect.provide(postgresLayer)),
  );
  runtime = ManagedRuntime.make(
    CatalogDatabase.layer.pipe(Layer.provide(postgresLayer)),
  );
}, 90_000);

afterAll(async () => {
  await runtime?.dispose();
  await pool?.end();
  await postgres?.stop();
});

beforeEach(async () => {
  projected = new Map();
  projectionWrites = 0;
  failProjection = false;
  await pool.query(`TRUNCATE "CatalogItem", "CatalogNpc"`);
});

const catalog = <A>(
  run: (modules: {
    items: ReturnType<typeof makeItemsModule>;
    npcs: ReturnType<typeof makeNpcsModule>;
    reads: ReturnType<typeof makeCatalogModule>;
  }) => Effect.Effect<A, unknown>,
) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const { read, write } = makeCatalogStore<ItemEntry, NpcEntry>(
        yield* CatalogDatabase,
        meilisearch,
      );

      return yield* run({
        items: makeItemsModule(meilisearch, write, logger),
        npcs: makeNpcsModule(meilisearch, write, logger),
        reads: makeCatalogModule(meilisearch, read, logger),
      });
    }),
  );

const storedItem = async (uid: string) =>
  (
    await pool.query<{ document: Partial<ItemEntry> }>(
      `SELECT document FROM "CatalogItem" WHERE uid = $1`,
      [uid],
    )
  ).rows[0]?.document;

const storedNpcs = async () =>
  (
    await pool.query<{ document: Partial<NpcEntry> }>(
      `SELECT document FROM "CatalogNpc" ORDER BY uid`,
    )
  ).rows.map(({ document }) => document);

const item = (id: number, world = "new") => ({
  id,
  name: `Item ${id}`,
  worlds: [world],
  icon: "item.gif",
  stat: "",
  lvl: 1,
  rarity: null,
  type: null,
  gameVersion: "pl" as const,
  observedAt: "2026-10-01T00:00:00.000Z",
});

function npcDrop(id: number, name: string) {
  return {
    id,
    identityNamespace: "template" as const,
    name,
    lvl: 100,
    icon: "npc.gif",
    type: "HERO",
    margonemType: 2,
    gameVersion: "pl" as const,
  };
}

test("keeps an item's worlds, earliest sighting and every NPC of its edition across batches and reordered deliveries", async () => {
  const nosferatu = npcDrop(7001, "Nosferatu");
  const vampire = npcDrop(7002, "Wampir");

  await catalog(({ items }) =>
    items.indexItems({
      items: [
        {
          ...item(1, "old"),
          observedAt: "2026-10-20T12:00:00.000Z",
          droppedBy: nosferatu,
        },
      ],
    }),
  );
  await catalog(({ items }) =>
    items.indexItems({
      items: [
        // A redelivered later sighting, then an earlier one from another NPC.
        {
          ...item(1),
          observedAt: "2026-10-25T08:00:00.000Z",
          droppedBy: nosferatu,
        },
        {
          ...item(1, "other"),
          observedAt: "2026-10-18T21:30:00.000Z",
          droppedBy: vampire,
        },
        // An older loot names the English edition's boss.
        {
          ...item(1),
          observedAt: "2026-10-19T10:00:00.000Z",
          droppedBy: { ...npcDrop(7003, "Negthotep"), gameVersion: "en" },
        },
      ],
    }),
  );

  const uid = itemCatalogKey(item(1));
  const entry = await storedItem(uid);

  expect(entry).toMatchObject({
    worlds: ["new", "old", "other"],
    firstSeenAt: Date.parse("2026-10-18T21:30:00.000Z"),
    droppedByKeys: [npcCatalogKey(nosferatu), npcCatalogKey(vampire)],
    droppedByMonsterKeys: ["pl_Nosferatu_HERO", "pl_Wampir_HERO"],
  });
  // The search index holds exactly what the database committed.
  expect(projected.get(ITEMS_INDEX)?.get(uid)).toEqual(entry);
});

test("keeps each edition and name of one item as its own entry", async () => {
  const trophy = (name: string, gameVersion: "en" | "pl") => ({
    ...item(62_271),
    name,
    gameVersion,
  });

  await catalog(({ items }) =>
    items.indexItems({
      items: [
        trophy("Seth's War Trophy", "pl"),
        trophy("Wojenne trofeum Seta", "pl"),
        trophy("Seth's War Trophy", "en"),
      ],
    }),
  );

  expect(projected.get(ITEMS_INDEX)?.size).toBe(3);
});

test("a new loot of an item keeps its drop rates, retirements and changes", async () => {
  const nosferatu = npcDrop(7001, "Nosferatu");
  const kostucha = npcDrop(7004, "Kostucha");
  const uid = itemCatalogKey(item(1));

  await catalog(({ items }) =>
    items.indexItems({
      items: [
        { ...item(1), droppedBy: nosferatu },
        { ...item(1), droppedBy: kostucha },
      ],
    }),
  );
  await catalog(({ items }) =>
    Effect.gen(function* () {
      yield* items.setMonsterDrops({
        monsters: [
          {
            gameVersion: "pl",
            name: "Nosferatu",
            type: "HERO",
            retiredItemIds: [],
            dropRates: [{ itemId: 1, drops: 12, kills: 300 }],
          },
          {
            gameVersion: "pl",
            name: "Kostucha",
            type: "HERO",
            retiredItemIds: [1],
            dropRates: [],
          },
        ],
      });
      yield* items.setItemRevisions({
        items: [
          {
            gameVersion: "pl",
            id: 1,
            revisions: [
              {
                name: "Item 1",
                icon: "item.gif",
                lvl: 1,
                stat: "",
                previousName: "Item 1",
                previousIcon: "old.gif",
                previousStat: "",
                changedAfter: "2026-09-30",
                changedBy: "2026-10-01",
              },
            ],
          },
        ],
      });
    }),
  );

  await catalog(({ items }) =>
    items.indexItems({
      items: [{ ...item(1, "later"), droppedBy: nosferatu }],
    }),
  );

  expect(await storedItem(uid)).toMatchObject({
    worlds: ["later", "new"],
    dropRates: [{ monsterKey: "pl_Nosferatu_HERO", drops: 12, kills: 300 }],
    // Nosferatu dropped it again; Kostucha has not.
    retiredDropMonsterKeys: ["pl_Kostucha_HERO"],
    changedOn: "2026-10-01",
  });
  expect(projected.get(ITEMS_INDEX)?.get(uid)).toEqual(await storedItem(uid));
});

test("replaces one monster's drop rates without touching another monster's", async () => {
  await catalog(({ items }) =>
    items.indexItems({
      items: [
        { ...item(2), droppedBy: npcDrop(7001, "Nosferatu") },
        { ...item(2), droppedBy: npcDrop(7004, "Kostucha") },
      ],
    }),
  );

  const monster = (name: string, drops: number) => ({
    gameVersion: "pl" as const,
    name,
    type: "HERO",
    retiredItemIds: [],
    dropRates: [{ itemId: 2, drops, kills: 400 }],
  });

  await catalog(({ items }) =>
    items.setMonsterDrops({ monsters: [monster("Kostucha", 4)] }),
  );
  await catalog(({ items }) =>
    items.setMonsterDrops({ monsters: [monster("Nosferatu", 9)] }),
  );

  expect((await storedItem(itemCatalogKey(item(2))))?.dropRates).toEqual([
    { monsterKey: "pl_Kostucha_HERO", drops: 4, kills: 400 },
    { monsterKey: "pl_Nosferatu_HERO", drops: 9, kills: 400 },
  ]);
});

test("collects the levels an item was seen at", async () => {
  await catalog(({ items }) =>
    items.indexItems({
      items: [42, 47, 57, 40, 300, 52].map((lvl) => ({ ...item(1), lvl })),
    }),
  );

  expect(await storedItem(itemCatalogKey(item(1)))).toMatchObject({
    observedLevels: [40, 42, 47, 52, 57],
    elasticLevel: true,
  });
});

test("a replayed batch changes nothing and writes nothing to the index", async () => {
  const batch = {
    items: [
      { ...item(1), droppedBy: npcDrop(7001, "Nosferatu") },
      { ...item(3, "other") },
    ],
  };

  await catalog(({ items }) => items.indexItems(batch));
  const first = await storedItem(itemCatalogKey(item(1)));
  const writes = projectionWrites;

  await catalog(({ items }) => items.indexItems(batch));

  expect(await storedItem(itemCatalogKey(item(1)))).toEqual(first);
  expect(projectionWrites).toBe(writes);
});

test("a failed projection keeps the change out of the database, so its retry applies it", async () => {
  failProjection = true;

  const indexing = catalog(({ items }) =>
    items.indexItems({ items: [item(1)] }),
  );

  expect(indexing).rejects.toBeDefined();
  await indexing.catch(() => undefined);
  expect(await storedItem(itemCatalogKey(item(1)))).toBeUndefined();

  failProjection = false;
  await catalog(({ items }) => items.indexItems({ items: [item(1)] }));
  expect(await storedItem(itemCatalogKey(item(1)))).toBeDefined();
});

const reuzen = {
  id: 306076,
  identityNamespace: "template" as const,
  name: "Reuzen",
  icon: "reuzen.gif",
  lvl: 244,
  wt: 90,
  type: "COLOSSUS",
  margonemType: 2,
  prof: null,
  world: "berufs",
  gameVersion: "pl" as const,
  lootId: 1,
  observedAt: "2026-10-01T00:00:00.000Z",
};

// An older client's entry from before the monster lost eight levels.
const formerReuzen = {
  ...reuzen,
  id: 173652,
  identityNamespace: "legacy" as const,
  lvl: 252,
};

test("a rebalanced monster is current only at its newest level, and an older loot retried later does not bring the former level back", async () => {
  await catalog(({ npcs }) =>
    npcs.indexNpcs({ npcs: [{ ...formerReuzen, lootId: 10 }] }),
  );
  await catalog(({ npcs }) =>
    npcs.indexNpcs({ npcs: [{ ...reuzen, lootId: 20 }] }),
  );

  expect(await storedNpcs()).toEqual([
    expect.objectContaining({
      uid: npcCatalogKey(formerReuzen),
      current: false,
    }),
    expect.objectContaining({ uid: npcCatalogKey(reuzen), current: true }),
  ]);

  await catalog(({ npcs }) =>
    npcs.indexNpcs({
      npcs: [{ ...formerReuzen, lootId: 5, world: "tempest" }],
    }),
  );

  expect(await storedNpcs()).toEqual([
    expect.objectContaining({
      uid: npcCatalogKey(formerReuzen),
      current: false,
      worlds: ["berufs", "tempest"],
    }),
    expect.objectContaining({ uid: npcCatalogKey(reuzen), current: true }),
  ]);
  expect([...(projected.get(NPCS_INDEX)?.values() ?? [])]).toEqual(
    expect.arrayContaining(await storedNpcs()),
  );
});

test("the catalog index names an id the game gave to a later item by that item, lists each current monster once, and an old key finds the monster as it is now", async () => {
  const sethSet = (name: string, observedAt: string) => ({
    ...item(8450),
    name,
    observedAt,
  });

  await catalog(({ items }) =>
    items.indexItems({
      items: [
        sethSet("Magia mrocznego Seta", "2025-06-17T10:00:00.000Z"),
        sethSet("Cholewy mrocznej kolaboracji", "2026-09-24T10:00:00.000Z"),
        item(2),
        { ...item(3), gameVersion: "en" },
      ],
    }),
  );
  await catalog(({ npcs }) =>
    npcs.indexNpcs({ npcs: [{ ...formerReuzen, lootId: 10 }] }),
  );
  await catalog(({ npcs }) =>
    npcs.indexNpcs({ npcs: [{ ...reuzen, lootId: 20 }] }),
  );

  const index = await catalog(({ reads }) =>
    reads.getIndex({ gameVersion: "pl" }),
  );

  expect(index).toEqual({
    items: [
      { id: 2, name: "Item 2" },
      { id: 8450, name: "Cholewy mrocznej kolaboracji" },
    ],
    npcs: [{ id: reuzen.id, name: reuzen.name }],
  });

  const found = await catalog(({ reads }) =>
    reads.getNpcs({ gameVersion: "pl", keys: [npcCatalogKey(formerReuzen)] }),
  );

  expect(found.hits).toEqual([
    expect.objectContaining({ key: npcCatalogKey(reuzen), lvl: reuzen.lvl }),
  ]);
  // Only the catalog's fields leave the service.
  expect(found.hits[0]).not.toHaveProperty("worlds");
});

test("a monster's maps and former levels reach each identity and survive new loots", async () => {
  const locations = [{ map: "Grota Martwodrzewów - sala", share: 1 }];
  const formerLevels = [{ lvl: 252, until: "2026-01-15" }];

  const monster = {
    gameVersion: "pl" as const,
    name: "Reuzen",
    type: "COLOSSUS",
  };

  await catalog(({ npcs }) =>
    npcs.indexNpcs({
      npcs: [
        { ...formerReuzen, lootId: 10 },
        { ...reuzen, lootId: 20 },
      ],
    }),
  );
  await catalog(({ npcs }) =>
    npcs.setLocations({ monsters: [{ ...monster, locations, formerLevels }] }),
  );
  await catalog(({ npcs }) =>
    npcs.indexNpcs({ npcs: [{ ...reuzen, lootId: 30, world: "tempest" }] }),
  );

  for (const npc of await storedNpcs()) {
    expect(npc).toMatchObject({ locations, formerLevels });
  }
});
