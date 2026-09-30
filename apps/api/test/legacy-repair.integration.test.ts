import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import {
  createItemStatsHash,
  createNpcSnapshotHash,
  createItemSnapshotHash,
} from "@lootlog/database/snapshot-hash";
import { parseItemStats, splitItemStat } from "@lootlog/database/item-stat";
import { LOOT_PERMISSION } from "@lootlog/domain/loot-visibility";
import { and, count, eq, inArray } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  legacyRepairEntryTable,
  legacyRepairLinkTable,
  legacyRepairRunTable,
} from "../src/database/drizzle/legacy-repair.schema.js";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  notificationRuleTable,
  notificationRuleUnresolvedSelectionTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  watchedItemTable,
} from "../src/database/drizzle/schema.js";
import {
  readLegacyRepairManifest,
  rowIdsChecksum,
} from "../src/legacy-repair/legacy-repair-manifest.js";
import {
  invalidateLegacyRepairCaches,
  makeLegacyRepair,
} from "../src/legacy-repair/legacy-repair.js";
import { buildLootQueryConditions } from "../src/loots/query/loot-query-filter.js";
import {
  resolveItemSnapshotIds,
  resolveNpcSnapshots,
} from "../src/loots/submission/loot-snapshot.persistence.js";
import { RedisService } from "../src/redis/redis.service.js";
import {
  getLootListCacheScope,
  getLootStatsCacheScope,
} from "../src/shared/cache.js";
import { createNotificationRuleFixture } from "./notification-fixtures.js";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

// One legacy NPC snapshot (level 183) linked from loots on two worlds after
// the NPC was reworked to level 210, a genuine pre-rework loot, an English
// item revision linked from Polish-world loots, a timer rule saved with a
// legacy catalog id and a watched item with an English name.

const suffix = Date.now() % 1_000_000;

const runId = `LOO-38-integration-${suffix}`;

const npcId = 800_000_000 + suffix;

const itemId = 810_000_000 + suffix;

const legacyTimerId = 820_000_000 + suffix;

const successorTimerId = 830_000_000 + suffix;

const worlds = [`repair-a-${suffix}`, `repair-b-${suffix}`] as const;

const affectedGuild = crypto.randomUUID();

const otherGuild = crypto.randomUUID();

const npcAttributes = {
  npcId,
  name: "Czempion Furboli",
  type: "ELITE2" as const,
  icon: "npc/furbol.gif",
  prof: "WARRIOR" as const,
  wt: 30,
  margonemType: 2,
};

const npcRevision = (world: string) => ({
  ...npcAttributes,
  identityNamespace: "legacy",
  gameVersion: "pl" as const,
  world,
  lvl: 210,
});

const itemStat = "binds;dmg=424,518;lvl=64;rarity=unique;opis=Grawer";

const itemRevision = {
  gameVersion: "pl" as const,
  itemId,
  name: "Mroźny łuk gnolla",
  icon: "luk/luk54-pl.gif",
  itemType: "DISTANCE_WEAPON",
  statsHash: createItemStatsHash(itemStat),
};

const cappedRole = {
  lvlRangeFrom: 0,
  lvlRangeTo: 190,
  permissions: [LOOT_PERMISSION.read],
};

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const run = <A, E>(effect: Effect.Effect<A, E, ApiDatabase>) =>
  runtime.runPromise(effect);

const db = <A, E>(
  query: (database: ApiDatabase["Service"]) => Effect.Effect<A, E>,
) => run(Effect.flatMap(ApiDatabase, query));

const noIds: number[] = [];

const fixture = {
  legacyNpcId: 0,
  existingWorldBRevisionId: 0,
  legacyItemId: 0,
  genuineLootNpcId: 0,
  worldALootNpcIds: [...noIds],
  worldBLootNpcIds: [...noIds],
  lootItemIds: [...noIds],
  lootIds: [...noIds],
  ruleId: 0,
  watchedItemId: 0,
  directory: "",
};

const insertLoot = (world: string, createdAt: Date, guildId = affectedGuild) =>
  db((database) =>
    Effect.gen(function* () {
      const [loot] = yield* database
        .insert(lootTable)
        .values({
          uniqueId: crypto.randomUUID(),
          world,
          source: "FIGHT",
          location: "Repair test",
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: lootTable.id });

      yield* database
        .insert(organizationLootRecordTable)
        .values({ guildId, lootId: loot!.id, updatedAt: createdAt });

      return loot!.id;
    }),
  );

const linkNpc = (lootId: number, npcSnapshotId: number) =>
  db((database) =>
    database
      .insert(lootNpcTable)
      .values({ lootId, npcSnapshotId })
      .returning({ id: lootNpcTable.id })
      .pipe(Effect.map(([row]) => row!.id)),
  );

const npcSnapshotOf = (lootNpcIds: readonly number[]) =>
  db((database) =>
    database
      .select({ id: lootNpcTable.id, snapshotId: lootNpcTable.npcSnapshotId })
      .from(lootNpcTable)
      .where(inArray(lootNpcTable.id, [...lootNpcIds])),
  ).then((rows) => new Map(rows.map(({ id, snapshotId }) => [id, snapshotId])));

// The loots a role capped below level 210 can read through the list and
// detail query, which shares its NPC-level predicate with statistics, the
// feed, search results and notification delivery.
const visibleToCappedRole = () =>
  db((database) =>
    database
      .select({ id: lootTable.id })
      .from(lootTable)
      .innerJoin(
        organizationLootRecordTable,
        eq(organizationLootRecordTable.lootId, lootTable.id),
      )
      .where(
        and(
          eq(organizationLootRecordTable.guildId, affectedGuild),
          inArray(lootTable.id, fixture.lootIds),
          ...buildLootQueryConditions({}, [], [cappedRole]),
        ),
      ),
  ).then((rows) =>
    rows.map(({ id }) => id).sort((left, right) => left - right),
  );

const manifestLine = (entry: { readonly entryId: string }) =>
  JSON.stringify({ manifestVersion: 1, runId, ...entry });

const rowsEntry = (entryId: string, table: string, ids: readonly number[]) =>
  JSON.stringify({ entryId, table, ids });

const writeManifest = async (
  directory: string,
  options: {
    readonly corruptChecksum?: boolean;
    readonly itemRowTable?: "LootItem" | "LootNpc";
  } = {},
) => {
  const itemRowTable = options.itemRowTable ?? "LootItem";

  await mkdir(join(directory, "rows"), { recursive: true });

  const npcEntry = (world: string, ids: readonly number[]) => ({
    entryId: `npc:revise:${fixture.legacyNpcId}:${world}:lvl210`,
    domain: "npc",
    action: "createRevisionAndRelink",
    classification: "confirmed",
    unresolvedReason: null,
    source: {
      snapshotId: fixture.legacyNpcId,
      rowTable: "LootNpc",
      rowCount: ids.length,
      rowIdsFile: "rows/npc.jsonl",
      rowIdsSha256: rowIdsChecksum(ids),
      selector: { worlds: [world] },
    },
    target: {
      proposedRevision: npcRevision(world),
      proposedSnapshotHash: createNpcSnapshotHash(npcRevision(world)),
    },
  });

  const itemEntryId = `item:revise:${fixture.legacyItemId}:pl`;
  const genuineEntryId = `npc:noop:${fixture.legacyNpcId}:genuinePreRework`;

  const entries = [
    npcEntry(worlds[0], fixture.worldALootNpcIds),
    npcEntry(worlds[1], fixture.worldBLootNpcIds),
    {
      entryId: genuineEntryId,
      domain: "npc",
      action: "noop",
      classification: "confirmed",
      source: {
        snapshotId: fixture.legacyNpcId,
        rowTable: "LootNpc",
        rowCount: 1,
        rowIdsFile: "rows/npc.jsonl",
        rowIdsSha256: options.corruptChecksum
          ? rowIdsChecksum([fixture.genuineLootNpcId + 1])
          : rowIdsChecksum([fixture.genuineLootNpcId]),
      },
    },
    {
      entryId: itemEntryId,
      domain: "item",
      action: "createRevisionAndRelink",
      classification: "confirmed",
      source: {
        snapshotId: fixture.legacyItemId,
        rowTable: itemRowTable,
        rowCount: fixture.lootItemIds.length,
        rowIdsFile: "rows/item.jsonl",
        rowIdsSha256: rowIdsChecksum(fixture.lootItemIds),
        selector: { worlds: [...worlds] },
      },
      target: {
        proposedRevision: itemRevision,
        proposedSnapshotHash: createItemSnapshotHash({
          ...itemRevision,
          stat: splitItemStat(itemStat).revision,
        }),
        nameIconSourceSnapshotId: fixture.legacyItemId + 1,
      },
    },
    {
      entryId: `timerRule:${fixture.ruleId}:${legacyTimerId}`,
      domain: "timerRule",
      action: "remapFilter",
      classification: "suspected",
      source: {
        ruleId: fixture.ruleId,
        npcId: legacyTimerId,
        names: ["Versus Zoons"],
      },
      target: { npcId: successorTimerId, name: "Versus Zoons" },
    },
    {
      entryId: `watchedItem:${fixture.watchedItemId}`,
      domain: "watchedItem",
      action: "markUnresolved",
      classification: "suspected",
      unresolvedReason: "nameFromOtherEditionNoSameEditionName",
      source: {
        watchedItemId: fixture.watchedItemId,
        itemId,
        itemName: "Gnoll Frostbow",
      },
    },
  ];

  await Bun.write(
    join(directory, "manifest.jsonl"),
    `${entries.map(manifestLine).join("\n")}\n`,
  );
  await Bun.write(
    join(directory, "rows/npc.jsonl"),
    [
      rowsEntry(entries[0]!.entryId, "LootNpc", fixture.worldALootNpcIds),
      rowsEntry(entries[1]!.entryId, "LootNpc", fixture.worldBLootNpcIds),
      rowsEntry(genuineEntryId, "LootNpc", [fixture.genuineLootNpcId]),
    ].join("\n"),
  );
  await Bun.write(
    join(directory, "rows/item.jsonl"),
    rowsEntry(itemEntryId, itemRowTable, fixture.lootItemIds),
  );

  return join(directory, "manifest.jsonl");
};

// Organizations passed to cache invalidation, one list per call.
const invalidations: string[][] = [];

const repair = () =>
  run(
    Effect.map(ApiDatabase, (database) =>
      makeLegacyRepair(database, (guildIds) =>
        Effect.sync(() => void invalidations.push([...guildIds])),
      ),
    ),
  );

const applyUntilComplete = async (manifestPath: string) => {
  const legacyRepair = await repair();
  const manifest = await run(readLegacyRepairManifest(manifestPath, runId));
  const invocations = [];

  for (;;) {
    const result = await run(
      legacyRepair.apply(manifest, { batchSize: 2, maxRows: 3 }),
    );

    invocations.push(result);

    if (result.complete) return invocations;
  }
};

describe("legacy association repair", () => {
  let genuineLootId = 0;
  let manifestPath = "";

  beforeAll(async () => {
    requireIsolatedTestDatabase();
    fixture.directory = await mkdtemp(join(tmpdir(), "loo-38-"));

    await db((database) =>
      database.insert(guildTable).values(
        [affectedGuild, otherGuild].map((id) => ({
          id,
          name: "Repair",
          ownerId: id,
          updatedAt: new Date(),
        })),
      ),
    );

    const [legacyNpc] = await db((database) =>
      database
        .insert(npcSnapshotTable)
        .values({ ...npcAttributes, lvl: 183 })
        .returning({ id: npcSnapshotTable.id }),
    );

    fixture.legacyNpcId = legacyNpc!.id;

    // An identical revision already written by a later observation.
    const [existing] = await db((database) =>
      database
        .insert(npcSnapshotTable)
        .values({
          ...npcRevision(worlds[1]),
          snapshotHash: createNpcSnapshotHash(npcRevision(worlds[1])),
        })
        .returning({ id: npcSnapshotTable.id }),
    );

    fixture.existingWorldBRevisionId = existing!.id;

    const [english, polish] = await db((database) =>
      database
        .insert(itemSnapshotTable)
        .values([
          {
            itemId,
            statsHash: createItemStatsHash(itemStat),
            name: "Gnoll Frostbow",
            icon: "luk/luk54.gif",
            lvl: 64,
            rarity: "UNIQUE",
            itemType: "DISTANCE_WEAPON",
            statRaw: itemStat,
            statsSnapshot: parseItemStats(itemStat),
          },
          {
            itemId,
            statsHash: createItemStatsHash("dmg=400,500;lvl=64;rarity=unique"),
            name: itemRevision.name,
            icon: itemRevision.icon,
            lvl: 64,
            rarity: "UNIQUE",
            itemType: "DISTANCE_WEAPON",
            statRaw: "dmg=400,500;lvl=64;rarity=unique",
            statsSnapshot: {},
          },
        ])
        .returning({ id: itemSnapshotTable.id }),
    );

    fixture.legacyItemId = english!.id;
    expect(polish!.id).toBe(english!.id + 1);

    genuineLootId = await insertLoot(
      worlds[0],
      new Date("2025-06-20T10:00:00Z"),
    );
    fixture.lootIds.push(genuineLootId);
    fixture.genuineLootNpcId = await linkNpc(
      genuineLootId,
      fixture.legacyNpcId,
    );

    for (const [index, world] of [
      worlds[0],
      worlds[0],
      worlds[0],
      worlds[0],
      worlds[0],
      worlds[1],
      worlds[1],
    ].entries()) {
      const lootId = await insertLoot(
        world,
        new Date(Date.UTC(2026, 7, 25, 10, index)),
      );

      fixture.lootIds.push(lootId);
      const lootNpcId = await linkNpc(lootId, fixture.legacyNpcId);

      (world === worlds[0]
        ? fixture.worldALootNpcIds
        : fixture.worldBLootNpcIds
      ).push(lootNpcId);

      if (index < 3) {
        const [lootItem] = await db((database) =>
          database
            .insert(lootItemTable)
            .values({
              lootId,
              itemSnapshotId: fixture.legacyItemId,
              hid: crypto.randomUUID(),
            })
            .returning({ id: lootItemTable.id }),
        );

        fixture.lootItemIds.push(lootItem!.id);
      }
    }

    // Another Organization's loot of the same NPC stays out of the manifest.
    const otherLoot = await insertLoot(worlds[0], new Date(), otherGuild);
    await linkNpc(otherLoot, fixture.legacyNpcId);

    const [rule] = await db((database) =>
      database
        .insert(notificationRuleTable)
        .values({
          ...createNotificationRuleFixture({
            ownerType: "GUILD",
            ownerId: affectedGuild,
            guildId: affectedGuild,
            world: worlds[0],
            triggerType: "TIMER_BEFORE_SPAWN",
            filters: { npcIds: [legacyTimerId] },
            scheduleStrategy: "SPAWN_WINDOW_RELATIVE",
            scheduleAnchor: "MIN_SPAWN",
            scheduleOffsetMinutes: 5,
            scheduledAt: null,
          }),
          id: undefined,
        })
        .returning({ id: notificationRuleTable.id }),
    );

    fixture.ruleId = rule!.id;

    const [watchedRule] = await db((database) =>
      database
        .insert(notificationRuleTable)
        .values({
          ...createNotificationRuleFixture({
            triggerType: "WATCHED_ITEM_DROPPED",
            world: worlds[0],
            filters: { itemId, guildIds: [affectedGuild] },
          }),
          id: undefined,
        })
        .returning({ id: notificationRuleTable.id }),
    );

    const [watched] = await db((database) =>
      database
        .insert(watchedItemTable)
        .values({
          userId: `user-${suffix}`,
          itemId,
          itemName: "Gnoll Frostbow",
          world: worlds[0],
          notificationRuleId: watchedRule!.id,
          updatedAt: new Date(),
        })
        .returning({ id: watchedItemTable.id }),
    );

    fixture.watchedItemId = watched!.id;
  });

  afterAll(async () => {
    await rm(fixture.directory, { recursive: true, force: true });
    await runtime.dispose();
  });

  for (const [name, options, reason] of [
    [
      "rows do not match their checksum",
      { corruptChecksum: true },
      "rowIdsSha256",
    ],
    [
      "an item entry lists NPC links",
      { itemRowTable: "LootNpc" },
      "LootNpc rows in an item entry",
    ],
  ] as const) {
    it(`refuses a manifest whose ${name} before writing anything`, async () => {
      const directory = join(fixture.directory, name.replaceAll(" ", "-"));
      const path = await writeManifest(directory, options);

      const failure = await run(
        Effect.flip(readLegacyRepairManifest(path, runId)),
      );

      expect(failure.message).toContain(reason);

      const [runs] = await db((database) =>
        database
          .select({ value: count() })
          .from(legacyRepairRunTable)
          .where(eq(legacyRepairRunTable.runId, runId)),
      );

      expect(runs!.value).toBe(0);
    });
  }

  it("relinks only the evidenced rows in bounded, resumable invocations", async () => {
    manifestPath = await writeManifest(join(fixture.directory, "valid"));

    // Before the repair every loot shows level 183 and passes the cap.
    expect(await visibleToCappedRole()).toEqual(
      fixture.lootIds.toSorted((left, right) => left - right),
    );

    const invocations = await applyUntilComplete(manifestPath);

    // Seven NPC links and three item links in batches of at most three rows.
    expect(invocations.map(({ processedRows }) => processedRows)).toEqual([
      3, 3, 3, 1,
    ]);

    // Every committed batch drops the moved loots' caches before the next
    // one runs, and only for the Organization that owns them.
    expect(invalidations.length).toBeGreaterThanOrEqual(5);
    expect(new Set(invalidations.flat())).toEqual(new Set([affectedGuild]));

    const [created] = await db((database) =>
      database
        .select()
        .from(npcSnapshotTable)
        .where(
          and(
            eq(npcSnapshotTable.npcId, npcId),
            eq(
              npcSnapshotTable.snapshotHash,
              createNpcSnapshotHash(npcRevision(worlds[0])),
            ),
          ),
        ),
    );

    expect(created).toMatchObject({
      identityNamespace: "legacy",
      world: worlds[0],
      gameVersion: "pl",
      lvl: 210,
      name: npcAttributes.name,
      icon: npcAttributes.icon,
    });

    const links = await npcSnapshotOf([
      fixture.genuineLootNpcId,
      ...fixture.worldALootNpcIds,
      ...fixture.worldBLootNpcIds,
    ]);

    expect(links.get(fixture.genuineLootNpcId)).toBe(fixture.legacyNpcId);
    expect(fixture.worldALootNpcIds.map((id) => links.get(id))).toEqual(
      fixture.worldALootNpcIds.map(() => created!.id),
    );
    expect(fixture.worldBLootNpcIds.map((id) => links.get(id))).toEqual(
      fixture.worldBLootNpcIds.map(() => fixture.existingWorldBRevisionId),
    );

    const lootItems = await db((database) =>
      database
        .select({
          snapshot: itemSnapshotTable,
          instanceStat: lootItemTable.instanceStat,
        })
        .from(lootItemTable)
        .innerJoin(
          itemSnapshotTable,
          eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
        )
        .where(inArray(lootItemTable.id, fixture.lootItemIds)),
    );

    expect(lootItems).toHaveLength(3);

    for (const { snapshot, instanceStat } of lootItems) {
      expect(snapshot).toMatchObject({
        gameVersion: "pl",
        name: itemRevision.name,
        icon: itemRevision.icon,
        statsHash: createItemStatsHash(itemStat),
        statRaw: splitItemStat(itemStat).revision,
        rarity: "UNIQUE",
        lvl: 64,
      });
      expect(instanceStat).toBeNull();
    }

    // Only the genuine level-183 loot remains below the role's cap.
    expect(await visibleToCappedRole()).toEqual([genuineLootId]);

    const selections = await db((database) =>
      database
        .select()
        .from(notificationRuleUnresolvedSelectionTable)
        .where(eq(notificationRuleUnresolvedSelectionTable.repairRunId, runId)),
    );

    expect(
      selections.map(({ kind, selectedId, reason, suggestedId }) => ({
        kind,
        selectedId,
        reason,
        suggestedId,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "npc",
          selectedId: legacyTimerId,
          reason: "legacyCatalogId",
          suggestedId: successorTimerId,
        },
        {
          kind: "item",
          selectedId: itemId,
          reason: "nameFromOtherEdition",
          suggestedId: null,
        },
      ]),
    );

    const [rule] = await db((database) =>
      database
        .select({ filters: notificationRuleTable.filters })
        .from(notificationRuleTable)
        .where(eq(notificationRuleTable.id, fixture.ruleId)),
    );

    expect(rule!.filters).toEqual({ npcIds: [legacyTimerId] });

    const entries = await db((database) =>
      database
        .select({
          entryId: legacyRepairEntryTable.entryId,
          status: legacyRepairEntryTable.status,
          targetCreated: legacyRepairEntryTable.targetCreated,
          appliedRows: legacyRepairEntryTable.appliedRows,
        })
        .from(legacyRepairEntryTable)
        .where(eq(legacyRepairEntryTable.runId, runId)),
    );

    expect(
      entries.find(({ entryId }) => entryId.endsWith(":genuinePreRework")),
    ).toEqual({
      entryId: `npc:noop:${fixture.legacyNpcId}:genuinePreRework`,
      status: "recorded",
      targetCreated: false,
      appliedRows: 0,
    });
    expect(entries.every(({ status }) => status !== "pending")).toBe(true);
  });

  it("keeps later observations off the legacy rows and lets versioned clients reuse the repaired revisions", async () => {
    const [versioned, unversioned] = await db((database) =>
      Effect.all([
        resolveNpcSnapshots(database, { world: worlds[0], gameVersion: "pl" }, [
          { ...npcAttributes, identityNamespace: "legacy", lvl: 210 },
        ]),
        resolveNpcSnapshots(database, { world: worlds[0], gameVersion: null }, [
          { ...npcAttributes, identityNamespace: "legacy", lvl: 183 },
        ]),
      ]),
    );

    const [repaired] = await db((database) =>
      database
        .select({ id: npcSnapshotTable.id })
        .from(npcSnapshotTable)
        .where(
          eq(
            npcSnapshotTable.snapshotHash,
            createNpcSnapshotHash(npcRevision(worlds[0])),
          ),
        ),
    );

    expect(versioned[0]!.id).toBe(repaired!.id);
    expect(unversioned[0]!.id).not.toBe(fixture.legacyNpcId);
    expect(unversioned[0]!.snapshotHash).not.toBeNull();

    const stat = splitItemStat(itemStat).revision;

    const [observedItemId] = await db((database) =>
      resolveItemSnapshotIds(database, [
        {
          ...itemRevision,
          snapshotHash: createItemSnapshotHash({ ...itemRevision, stat }),
          lvl: 64,
          rarity: "UNIQUE",
          statRaw: stat,
          statsSnapshot: parseItemStats(stat),
        },
      ]),
    );

    const [repairedItem] = await db((database) =>
      database
        .select({ id: lootItemTable.itemSnapshotId })
        .from(lootItemTable)
        .where(eq(lootItemTable.id, fixture.lootItemIds[0]!)),
    );

    expect(observedItemId).toBe(repairedItem!.id);
  });

  it("changes nothing when applied again", async () => {
    const before = await db((database) =>
      database
        .select({ value: count() })
        .from(legacyRepairLinkTable)
        .where(eq(legacyRepairLinkTable.runId, runId)),
    );

    const invocations = await applyUntilComplete(manifestPath);

    expect(invocations).toEqual([
      expect.objectContaining({ complete: true, processedRows: 0 }),
    ]);

    const after = await db((database) =>
      database
        .select({ value: count() })
        .from(legacyRepairLinkTable)
        .where(eq(legacyRepairLinkTable.runId, runId)),
    );

    expect(after).toEqual(before);
    expect(before[0]!.value).toBe(10);
  });

  it("invalidates cached reads only for Organizations whose loots moved", async () => {
    const affected = await run((await repair()).affectedOrganizationIds(runId));

    expect(affected).toEqual([affectedGuild]);

    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");

    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");

    const redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );

    try {
      const redis = new RedisService(
        await redisRuntime.runPromise(Redis.Redis),
        { prefix: `legacy-repair-${suffix}` },
        (effect) => redisRuntime.runPromise(effect),
      );

      const generations = (guildId: string) =>
        Promise.all(
          [getLootListCacheScope(guildId), getLootStatsCacheScope(guildId)].map(
            (scope) => redis.get(`cache-generation:v1:${scope}`),
          ),
        );

      const before = await generations(affectedGuild);

      await run(invalidateLegacyRepairCaches(redis, affected));

      const after = await generations(affectedGuild);

      expect(after.every(Boolean)).toBe(true);
      expect(after).not.toEqual(before);
      expect(await generations(otherGuild)).toEqual([null, null]);
    } finally {
      await redisRuntime.dispose();
    }
  });

  it("rolls back exactly the logged rows and keeps records accepted since", async () => {
    const [created] = await db((database) =>
      database
        .select({ id: npcSnapshotTable.id })
        .from(npcSnapshotTable)
        .where(
          eq(
            npcSnapshotTable.snapshotHash,
            createNpcSnapshotHash(npcRevision(worlds[0])),
          ),
        ),
    );

    // A newer loot reuses the repaired revision, and one repaired link was
    // corrected again after the repair.
    const newerLoot = await insertLoot(worlds[0], new Date());
    const newerLink = await linkNpc(newerLoot, created!.id);

    const [corrected] = fixture.worldALootNpcIds.slice(-1);

    const [elsewhere] = await db((database) =>
      database
        .insert(npcSnapshotTable)
        .values({
          ...npcAttributes,
          lvl: 211,
          world: worlds[0],
          snapshotHash: crypto.randomUUID(),
        })
        .returning({ id: npcSnapshotTable.id }),
    );

    await db((database) =>
      database
        .update(lootNpcTable)
        .set({ npcSnapshotId: elsewhere!.id })
        .where(eq(lootNpcTable.id, corrected!)),
    );

    const legacyRepair = await repair();

    for (;;) {
      const result = await run(
        legacyRepair.rollback(runId, { batchSize: 2, maxRows: 3 }),
      );

      if (result.complete) break;
    }

    const links = await npcSnapshotOf([
      ...fixture.worldALootNpcIds,
      ...fixture.worldBLootNpcIds,
      newerLink,
    ]);

    expect(
      fixture.worldALootNpcIds.slice(0, -1).map((id) => links.get(id)),
    ).toEqual([1, 2, 3, 4].map(() => fixture.legacyNpcId));
    expect(links.get(corrected!)).toBe(elsewhere!.id);
    expect(fixture.worldBLootNpcIds.map((id) => links.get(id))).toEqual(
      fixture.worldBLootNpcIds.map(() => fixture.legacyNpcId),
    );
    expect(links.get(newerLink)).toBe(created!.id);

    const revisions = await db((database) =>
      database
        .select({ id: npcSnapshotTable.id })
        .from(npcSnapshotTable)
        .where(
          inArray(npcSnapshotTable.id, [
            created!.id,
            fixture.existingWorldBRevisionId,
          ]),
        ),
    );

    // The created revision is referenced by the newer loot; the pre-existing
    // one was never this run's to remove.
    expect(revisions).toHaveLength(2);

    const items = await db((database) =>
      database
        .select({
          itemSnapshotId: lootItemTable.itemSnapshotId,
        })
        .from(lootItemTable)
        .where(inArray(lootItemTable.id, fixture.lootItemIds)),
    );

    expect(items.map(({ itemSnapshotId }) => itemSnapshotId)).toEqual(
      fixture.lootItemIds.map(() => fixture.legacyItemId),
    );

    const [itemRevisions] = await db((database) =>
      database
        .select({ value: count() })
        .from(itemSnapshotTable)
        .where(
          and(
            eq(itemSnapshotTable.itemId, itemId),
            eq(itemSnapshotTable.gameVersion, "pl"),
          ),
        ),
    );

    expect(itemRevisions!.value).toBe(0);

    const [selections] = await db((database) =>
      database
        .select({ value: count() })
        .from(notificationRuleUnresolvedSelectionTable)
        .where(eq(notificationRuleUnresolvedSelectionTable.repairRunId, runId)),
    );

    expect(selections!.value).toBe(0);
    expect(await visibleToCappedRole()).toEqual(
      fixture.lootIds.filter(
        (lootId, index) => index !== fixture.worldALootNpcIds.length,
      ),
    );

    const [runRow] = await db((database) =>
      database
        .select({ status: legacyRepairRunTable.status })
        .from(legacyRepairRunTable)
        .where(eq(legacyRepairRunTable.runId, runId)),
    );

    expect(runRow!.status).toBe("rolledBack");
  });

  it("refuses to apply a rolled-back run again", async () => {
    const legacyRepair = await repair();
    const manifest = await run(readLegacyRepairManifest(manifestPath, runId));

    const failure = await run(
      Effect.flip(legacyRepair.apply(manifest, { batchSize: 2, maxRows: 3 })),
    );

    expect(failure.message).toContain("rolled back");
  });
});
