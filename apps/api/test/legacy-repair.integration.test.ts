import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import {
  createItemSnapshotHash,
  createItemStatsHash,
  createNpcSnapshotHash,
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
  memberTable,
  notificationRuleTable,
  notificationRuleUnresolvedSelectionTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  timerHistoryEntryTable,
  watchedItemTable,
} from "../src/database/drizzle/schema.js";
import {
  readLegacyRepairManifest,
  rowIdsChecksum,
} from "../src/legacy-repair/legacy-repair-manifest.js";
import {
  planLegacyRepair,
  type LegacyRepairPlan,
  type LegacyRepairPlanLine,
} from "../src/legacy-repair/legacy-repair-plan.js";
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

// A legacy NPC revision (level 183) linked from loots on two Polish worlds
// after the NPC was reworked to level 210, from genuine pre-rework loots and
// from an English-world loot, plus a per-world revision of the reworked NPC.
// A legacy item revision whose English name was first written on an English
// world, linked from Polish-world loots, with a later English revision of the
// same presentation. A timer rule saved with a legacy catalog id and a watched
// item with an English name.

const suffix = Date.now() % 1_000_000;

const runId = `LOO-250-integration-${suffix}`;

const npcId = 800_000_000 + suffix;

const itemId = 810_000_000 + suffix;

const legacyTimerId = 820_000_000 + suffix;

const successorTimerId = 830_000_000 + suffix;

const polishWorlds = [`repair-a-${suffix}`, `repair-b-${suffix}`] as const;

const englishWorld = "cronus";

const affectedGuild = crypto.randomUUID();

const otherGuild = crypto.randomUUID();

const npcAttributes = {
  npcId,
  identityNamespace: "legacy" as const,
  name: "Czempion Furboli",
  type: "ELITE2" as const,
  icon: "npc/furbol.gif",
  prof: "WARRIOR" as const,
  wt: 30,
  margonemType: 2,
};

const npcRevision = (gameVersion: "pl" | "en", lvl: number) => ({
  ...npcAttributes,
  gameVersion,
  lvl,
});

// The first writer's stats carry a per-instance description.
const englishStat = "binds;dmg=424,518;lvl=64;rarity=unique;opis=Grawer";

const polishStat = "dmg=400,500;lvl=64;rarity=unique";

const englishItem = {
  itemId,
  name: "Gnoll Frostbow",
  icon: "luk/luk54.gif",
  itemType: "DISTANCE_WEAPON",
  statsHash: createItemStatsHash(englishStat),
};

const polishItem = {
  ...englishItem,
  name: "Mroźny łuk gnolla",
  icon: "luk/luk54-pl.gif",
};

const itemHash = (
  gameVersion: "pl" | "en",
  { statsHash: _statsHash, ...item }: typeof englishItem,
  stat = englishStat,
) =>
  createItemSnapshotHash({
    ...item,
    gameVersion,
    stat: splitItemStat(stat).revision,
  });

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
  perWorldNpcId: 0,
  legacyItemId: 0,
  polishItemId: 0,
  englishRevisionId: 0,
  observedEnglishNpcId: 0,
  concurrentNpcId: 0,
  concurrentLootNpcId: 0,
  genuineLootNpcIds: [...noIds],
  reworkedLootNpcIds: [...noIds],
  englishLootNpcId: 0,
  perWorldLootNpcId: 0,
  polishLootItemIds: [...noIds],
  firstEnglishLootItemId: 0,
  englishRevisionLootItemId: 0,
  npcLootIds: [...noIds],
  ruleId: 0,
  watchedItemId: 0,
  directory: "",
};

const snapshotIds = () =>
  new Set([
    fixture.legacyNpcId,
    fixture.perWorldNpcId,
    fixture.legacyItemId,
    fixture.polishItemId,
    fixture.englishRevisionId,
  ]);

const insertLoot = (
  world: string,
  createdAt: Date,
  guildId = affectedGuild,
  gameVersion: "pl" | "en" | null = null,
) =>
  db((database) =>
    Effect.gen(function* () {
      const [loot] = yield* database
        .insert(lootTable)
        .values({
          uniqueId: crypto.randomUUID(),
          world,
          gameVersion,
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

const linkItem = (lootId: number, itemSnapshotId: number) =>
  db((database) =>
    database
      .insert(lootItemTable)
      .values({ lootId, itemSnapshotId, hid: crypto.randomUUID() })
      .returning({ id: lootItemTable.id })
      .pipe(Effect.map(([row]) => row!.id)),
  );

const npcLinks = () =>
  db((database) =>
    database
      .select({ id: lootNpcTable.id, snapshotId: lootNpcTable.npcSnapshotId })
      .from(lootNpcTable)
      .where(inArray(lootNpcTable.lootId, fixture.npcLootIds)),
  ).then((rows) => new Map(rows.map(({ id, snapshotId }) => [id, snapshotId])));

const itemLinks = () =>
  db((database) =>
    database
      .select({
        id: lootItemTable.id,
        snapshotId: lootItemTable.itemSnapshotId,
      })
      .from(lootItemTable)
      .where(
        inArray(lootItemTable.id, [
          ...fixture.polishLootItemIds,
          fixture.firstEnglishLootItemId,
          fixture.englishRevisionLootItemId,
        ]),
      ),
  ).then((rows) => new Map(rows.map(({ id, snapshotId }) => [id, snapshotId])));

const revisions = () =>
  db((database) =>
    Effect.all([
      database
        .select()
        .from(npcSnapshotTable)
        .where(eq(npcSnapshotTable.npcId, npcId)),
      database
        .select()
        .from(itemSnapshotTable)
        .where(eq(itemSnapshotTable.itemId, itemId)),
    ]),
  ).then(([npcs, items]) => ({
    npcs: npcs.toSorted((left, right) => left.id - right.id),
    items: items.toSorted((left, right) => left.id - right.id),
  }));

const npcRevisionId = (gameVersion: "pl" | "en", lvl: number) =>
  db((database) =>
    database
      .select({ id: npcSnapshotTable.id })
      .from(npcSnapshotTable)
      .where(
        and(
          eq(npcSnapshotTable.npcId, npcId),
          eq(
            npcSnapshotTable.snapshotHash,
            createNpcSnapshotHash(npcRevision(gameVersion, lvl)),
          ),
        ),
      ),
  ).then(([row]) => row?.id);

// The NPC loots a role capped below level 210 can read through the list and
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
          inArray(lootTable.id, fixture.npcLootIds),
          ...buildLootQueryConditions({}, [], [cappedRole]),
        ),
      ),
  ).then((rows) =>
    rows.map(({ id }) => id).sort((left, right) => left - right),
  );

const lootOf = (lootNpcId: number) =>
  db((database) =>
    database
      .select({ lootId: lootNpcTable.lootId })
      .from(lootNpcTable)
      .where(eq(lootNpcTable.id, lootNpcId)),
  ).then(([row]) => row!.lootId);

const planned = () =>
  run(
    Effect.flatMap(ApiDatabase, (database) =>
      planLegacyRepair(database, runId),
    ),
  );

// The plan of this fixture's revisions: the database also holds other suites'
// rows, which the test leaves to them.
const fixturePlan = (plan: LegacyRepairPlan) => {
  const ids = snapshotIds();

  const lines = plan.lines.filter(
    ({ entryId, source }) =>
      entryId === "1:loot:backfill" || ids.has(Number(source["snapshotId"])),
  );

  const entryIds = new Set(lines.map(({ entryId }) => entryId));

  return {
    lines,
    rows: plan.rows.filter(({ entryId }) => entryIds.has(entryId)),
  };
};

// Saved notification selections come from the LOO-38 dry run.
const selectionLines = () => [
  {
    manifestVersion: 2,
    runId,
    entryId: `5:timerRule:${fixture.ruleId}:${legacyTimerId}`,
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
    manifestVersion: 2,
    runId,
    entryId: `5:watchedItem:${fixture.watchedItemId}`,
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

type ManifestLine =
  | LegacyRepairPlanLine
  | ReturnType<typeof selectionLines>[number];

const writeManifest = async (
  directory: string,
  plan: ReturnType<typeof fixturePlan>,
  edit: (line: ManifestLine) => object = (line) => line,
) => {
  await mkdir(join(directory, "rows"), { recursive: true });

  await Bun.write(
    join(directory, "manifest.jsonl"),
    [...plan.lines, ...selectionLines()]
      .map((line) => JSON.stringify(edit(line)))
      .join("\n"),
  );

  for (const file of new Set(plan.rows.map((row) => row.file))) {
    await Bun.write(
      join(directory, `rows/${file}.jsonl`),
      plan.rows
        .filter((row) => row.file === file)
        .map(({ entryId, table, ids }) =>
          JSON.stringify({ entryId, table, ids }),
        )
        .join("\n"),
    );
  }

  return join(directory, "manifest.jsonl");
};

// Organizations passed to cache invalidation, one list per call.
const invalidations: string[][] = [];

const repair = () =>
  run(
    Effect.map(ApiDatabase, (database) =>
      makeLegacyRepair(database, {
        invalidateCaches: (guildIds) =>
          Effect.sync(() => void invalidations.push([...guildIds])),
        retireSettleMillis: 0,
      }),
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
  let plan: ReturnType<typeof fixturePlan>;
  let manifestPath = "";
  let before: Awaited<ReturnType<typeof revisions>>;
  let linksBefore: [Map<number, number>, Map<number, number>];

  beforeAll(async () => {
    requireIsolatedTestDatabase();
    fixture.directory = await mkdtemp(join(tmpdir(), "loo-250-"));

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

    const [member] = await db((database) =>
      database
        .insert(memberTable)
        .values({
          guildId: affectedGuild,
          userId: `repair-${suffix}`,
          name: "Timer keeper",
          updatedAt: new Date(),
        })
        .returning({ id: memberTable.id }),
    );

    // Timers observed the reworked level on both Polish worlds.
    await db((database) =>
      database.insert(timerHistoryEntryTable).values(
        polishWorlds.map((world, index) => ({
          guildId: affectedGuild,
          world,
          timerKey: `repair-${suffix}-${index}`,
          npcId,
          npc: { name: npcAttributes.name, lvl: 210 },
          action: "CREATE" as const,
          actorMemberId: member!.id,
          createdAt: new Date(Date.UTC(2026, 7, 24 + index * 2, 12)),
        })),
      ),
    );

    const [legacyNpc, perWorldNpc] = await db((database) =>
      database
        .insert(npcSnapshotTable)
        .values([
          { ...npcAttributes, lvl: 183 },
          // A revision written per world before editions.
          {
            ...npcAttributes,
            lvl: 210,
            world: polishWorlds[1],
            gameVersion: "pl",
            snapshotHash: `per-world-${suffix}`,
          },
        ])
        .returning({ id: npcSnapshotTable.id }),
    );

    fixture.legacyNpcId = legacyNpc!.id;
    fixture.perWorldNpcId = perWorldNpc!.id;

    const [legacyItem, polish, englishRevision] = await db((database) =>
      database
        .insert(itemSnapshotTable)
        .values([
          {
            ...englishItem,
            lvl: 64,
            rarity: "UNIQUE",
            statRaw: englishStat,
            statsSnapshot: parseItemStats(englishStat),
          },
          {
            ...polishItem,
            statsHash: createItemStatsHash(polishStat),
            lvl: 64,
            rarity: "UNIQUE",
            statRaw: polishStat,
            statsSnapshot: parseItemStats(polishStat),
          },
          // A later English observation of the same presentation.
          {
            ...englishItem,
            gameVersion: "en",
            snapshotHash: itemHash("en", englishItem),
            lvl: 64,
            rarity: "UNIQUE",
            statRaw: splitItemStat(englishStat).revision,
            statsSnapshot: parseItemStats(splitItemStat(englishStat).revision),
          },
        ])
        .returning({ id: itemSnapshotTable.id }),
    );

    fixture.legacyItemId = legacyItem!.id;
    fixture.polishItemId = polish!.id;
    fixture.englishRevisionId = englishRevision!.id;

    // The English name was written first, on an English world.
    const firstEnglishLoot = await insertLoot(
      englishWorld,
      new Date("2026-07-01T10:00:00Z"),
    );

    fixture.firstEnglishLootItemId = await linkItem(
      firstEnglishLoot,
      fixture.legacyItemId,
    );

    await linkItem(
      await insertLoot(polishWorlds[0], new Date("2026-07-02T10:00:00Z")),
      fixture.polishItemId,
    );

    for (const index of [0, 1]) {
      const lootId = await insertLoot(
        polishWorlds[0],
        new Date(Date.UTC(2025, 5, 20, 10, index)),
      );

      fixture.npcLootIds.push(lootId);
      fixture.genuineLootNpcIds.push(
        await linkNpc(lootId, fixture.legacyNpcId),
      );
    }

    for (const [index, world] of [
      polishWorlds[0],
      polishWorlds[0],
      polishWorlds[0],
      polishWorlds[0],
      polishWorlds[0],
      polishWorlds[1],
      polishWorlds[1],
    ].entries()) {
      const lootId = await insertLoot(
        world,
        new Date(Date.UTC(2026, 7, 25, 10, index)),
      );

      fixture.npcLootIds.push(lootId);
      fixture.reworkedLootNpcIds.push(
        await linkNpc(lootId, fixture.legacyNpcId),
      );

      if (index < 3) {
        fixture.polishLootItemIds.push(
          await linkItem(lootId, fixture.legacyItemId),
        );
      }
    }

    const englishLoot = await insertLoot(
      englishWorld,
      new Date(Date.UTC(2026, 7, 25, 11)),
    );

    fixture.npcLootIds.push(englishLoot);
    fixture.englishLootNpcId = await linkNpc(englishLoot, fixture.legacyNpcId);

    const perWorldLoot = await insertLoot(
      polishWorlds[1],
      new Date(Date.UTC(2026, 8, 20, 10)),
    );

    fixture.npcLootIds.push(perWorldLoot);
    fixture.perWorldLootNpcId = await linkNpc(
      perWorldLoot,
      fixture.perWorldNpcId,
    );

    fixture.englishRevisionLootItemId = await linkItem(
      await insertLoot(
        englishWorld,
        new Date(Date.UTC(2026, 8, 30, 10)),
        otherGuild,
        "en",
      ),
      fixture.englishRevisionId,
    );

    const [rule] = await db((database) =>
      database
        .insert(notificationRuleTable)
        .values({
          ...createNotificationRuleFixture({
            ownerType: "GUILD",
            ownerId: affectedGuild,
            guildId: affectedGuild,
            world: polishWorlds[0],
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
            world: polishWorlds[0],
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
          world: polishWorlds[0],
          notificationRuleId: watchedRule!.id,
          updatedAt: new Date(),
        })
        .returning({ id: watchedItemTable.id }),
    );

    fixture.watchedItemId = watched!.id;

    before = await revisions();
    linksBefore = await Promise.all([npcLinks(), itemLinks()]);
  });

  afterAll(async () => {
    await rm(fixture.directory, { recursive: true, force: true });
    await runtime.dispose();
  });

  it("plans one revision per edition without translating names", async () => {
    plan = fixturePlan(await planned());

    const decisions = new Map(
      plan.lines.map((line) => [
        line.entryId,
        {
          action: line.action,
          reason: line.unresolvedReason,
          target: line.target,
          rows:
            plan.rows.find(({ entryId }) => entryId === line.entryId)?.ids ??
            null,
        },
      ]),
    );

    const legacy = fixture.legacyNpcId;

    expect([...decisions.keys()].sort()).toEqual(
      [
        "1:loot:backfill",
        `2:npc:promote:${legacy}`,
        `3:npc:relink:${legacy}:pl:210`,
        `3:npc:relink:${legacy}:en:183`,
        `3:npc:relink:${fixture.perWorldNpcId}:pl:210`,
        `4:npc:unresolved:noDatedEvidence:${legacy}`,
        `4:npc:unresolved:onlyOtherEditionEvidence:${legacy}`,
        `2:item:promote:${fixture.legacyItemId}`,
        `2:item:promote:${fixture.polishItemId}`,
        `3:item:relink:${fixture.legacyItemId}:pl`,
      ].sort(),
    );

    // The legacy NPC keeps its level and its Polish links: most of them.
    expect(decisions.get(`2:npc:promote:${legacy}`)?.target).toMatchObject({
      proposedRevision: npcRevision("pl", 183),
    });
    expect(decisions.get(`3:npc:relink:${legacy}:pl:210`)?.rows).toEqual(
      fixture.reworkedLootNpcIds,
    );
    expect(decisions.get(`3:npc:relink:${legacy}:en:183`)?.rows).toEqual([
      fixture.englishLootNpcId,
    ]);
    expect(
      decisions.get(`4:npc:unresolved:noDatedEvidence:${legacy}`)?.rows,
    ).toEqual(fixture.genuineLootNpcIds);

    // The English name stays with the English edition, whose later revision
    // hands its hash over; Polish loots take the Polish revision's name.
    expect(
      decisions.get(`2:item:promote:${fixture.legacyItemId}`)?.target,
    ).toMatchObject({
      proposedRevision: { gameVersion: "en", name: englishItem.name },
      retireSnapshotId: fixture.englishRevisionId,
    });
    expect(
      decisions.get(`3:item:relink:${fixture.legacyItemId}:pl`),
    ).toMatchObject({
      target: {
        proposedRevision: { gameVersion: "pl", name: polishItem.name },
        nameIconSourceSnapshotId: fixture.polishItemId,
      },
      rows: fixture.polishLootItemIds,
    });

    manifestPath = await writeManifest(join(fixture.directory, "valid"), plan);
  });

  for (const [name, edit, reason] of [
    [
      "was written before editions",
      (line: ManifestLine) => ({ ...line, manifestVersion: 1 }),
      "unsupported manifestVersion",
    ],
    [
      "rows do not match their checksum",
      (line: ManifestLine) =>
        line.action === "relinkRevision"
          ? {
              ...line,
              source: { ...line.source, rowIdsSha256: rowIdsChecksum([0]) },
            }
          : line,
      "rowIdsSha256",
    ],
    [
      "item entry lists NPC links",
      (line: ManifestLine) =>
        line.domain === "item" && line.action === "relinkRevision"
          ? { ...line, domain: "npc" }
          : line,
      "LootItem rows in an npc entry",
    ],
  ] as const) {
    it(`refuses a manifest whose ${name} before writing anything`, async () => {
      const path = await writeManifest(
        join(fixture.directory, name.replaceAll(" ", "-")),
        plan,
        edit,
      );

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

  it("promotes, relinks and backfills in bounded, resumable invocations", async () => {
    // Before the repair every loot shows level 183 or 210 as first written.
    expect(await visibleToCappedRole()).toEqual(
      fixture.npcLootIds.slice(0, -1).toSorted((left, right) => left - right),
    );

    // The API, already writing edition revisions, accepts the legacy NPC
    // between the plan and its application.
    const [concurrent] = await db((database) =>
      resolveNpcSnapshots(database, "pl", [{ ...npcAttributes, lvl: 183 }]),
    );

    fixture.concurrentNpcId = concurrent!.id;
    fixture.concurrentLootNpcId = await linkNpc(
      await insertLoot(polishWorlds[0], new Date(), affectedGuild, "pl"),
      concurrent!.id,
    );

    const invocations = await applyUntilComplete(manifestPath);

    expect(invocations.length).toBeGreaterThan(3);
    expect(invocations.every(({ processedRows }) => processedRows <= 3)).toBe(
      true,
    );

    const { npcs, items } = await revisions();

    const byId = <T extends { id: number }>(rows: T[], id: number) =>
      rows.find((row) => row.id === id);

    // The legacy NPC revision is now the Polish level-183 revision.
    expect(byId(npcs, fixture.legacyNpcId)).toMatchObject({
      gameVersion: "pl",
      world: null,
      lvl: 183,
      snapshotHash: createNpcSnapshotHash(npcRevision("pl", 183)),
    });

    const polish210 = await npcRevisionId("pl", 210);
    const english183 = await npcRevisionId("en", 183);

    expect(byId(npcs, polish210!)).toMatchObject({ world: null, lvl: 210 });

    const links = await npcLinks();

    expect(fixture.genuineLootNpcIds.map((id) => links.get(id))).toEqual(
      fixture.genuineLootNpcIds.map(() => fixture.legacyNpcId),
    );

    // The revision the API wrote handed its hash and its loot over.
    expect(byId(npcs, fixture.concurrentNpcId)?.snapshotHash).toBeNull();
    expect(
      (
        await db((database) =>
          database
            .select({ snapshotId: lootNpcTable.npcSnapshotId })
            .from(lootNpcTable)
            .where(eq(lootNpcTable.id, fixture.concurrentLootNpcId)),
        )
      )[0]?.snapshotId,
    ).toBe(fixture.legacyNpcId);
    // One revision for both Polish worlds and the per-world revision.
    expect(
      [...fixture.reworkedLootNpcIds, fixture.perWorldLootNpcId].map((id) =>
        links.get(id),
      ),
    ).toEqual([...fixture.reworkedLootNpcIds, 0].map(() => polish210));
    expect(links.get(fixture.englishLootNpcId)).toBe(english183);

    // Only loots with the stored level 183 remain below the role's cap.
    expect(await visibleToCappedRole()).toEqual(
      (
        await Promise.all(
          [...fixture.genuineLootNpcIds, fixture.englishLootNpcId].map(lootOf),
        )
      ).toSorted((left, right) => left - right),
    );

    // The legacy item is the English revision, without the first writer's
    // per-instance description; the later English revision handed over its
    // hash and its loot.
    expect(byId(items, fixture.legacyItemId)).toMatchObject({
      gameVersion: "en",
      name: englishItem.name,
      statRaw: splitItemStat(englishStat).revision,
      snapshotHash: itemHash("en", englishItem),
    });
    expect(byId(items, fixture.englishRevisionId)?.snapshotHash).toBeNull();
    expect(byId(items, fixture.polishItemId)).toMatchObject({
      gameVersion: "pl",
      snapshotHash: itemHash("pl", polishItem, polishStat),
    });

    const itemTargets = await itemLinks();

    expect(itemTargets.get(fixture.englishRevisionLootItemId)).toBe(
      fixture.legacyItemId,
    );

    const polishRelinked = byId(
      items,
      itemTargets.get(fixture.polishLootItemIds[0]!)!,
    );

    expect(polishRelinked).toMatchObject({
      gameVersion: "pl",
      name: polishItem.name,
      icon: polishItem.icon,
      statsHash: englishItem.statsHash,
      rarity: "UNIQUE",
      lvl: 64,
    });
    expect(fixture.polishLootItemIds.map((id) => itemTargets.get(id))).toEqual(
      fixture.polishLootItemIds.map(() => polishRelinked!.id),
    );

    // Every loot has an edition; a declared one is kept.
    const editions = await db((database) =>
      database
        .select({ world: lootTable.world, gameVersion: lootTable.gameVersion })
        .from(lootTable)
        .where(inArray(lootTable.id, fixture.npcLootIds)),
    );

    expect(
      editions.every(
        ({ world, gameVersion }) =>
          gameVersion === (world === englishWorld ? "en" : "pl"),
      ),
    ).toBe(true);

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
        .select({ status: legacyRepairEntryTable.status })
        .from(legacyRepairEntryTable)
        .where(eq(legacyRepairEntryTable.runId, runId)),
    );

    expect(entries.every(({ status }) => status !== "pending")).toBe(true);
  });

  it("lets later observations reuse the edition revisions", async () => {
    const [polish183, polish210, english210] = await db((database) =>
      Effect.all([
        resolveNpcSnapshots(database, "pl", [{ ...npcAttributes, lvl: 183 }]),
        resolveNpcSnapshots(database, "pl", [{ ...npcAttributes, lvl: 210 }]),
        resolveNpcSnapshots(database, "en", [{ ...npcAttributes, lvl: 210 }]),
      ]),
    );

    expect(polish183[0]!.id).toBe(fixture.legacyNpcId);
    expect(polish210[0]!.id).toBe((await npcRevisionId("pl", 210))!);
    expect(english210[0]!).toMatchObject({ gameVersion: "en", world: null });
    fixture.observedEnglishNpcId = english210[0]!.id;

    const stat = splitItemStat(englishStat).revision;

    const [observed] = await db((database) =>
      resolveItemSnapshotIds(database, [
        {
          ...englishItem,
          gameVersion: "en",
          snapshotHash: itemHash("en", englishItem),
          lvl: 64,
          rarity: "UNIQUE",
          statRaw: stat,
          statsSnapshot: parseItemStats(stat),
        },
      ]),
    );

    expect(observed).toBe(fixture.legacyItemId);
  });

  it("changes nothing when applied again", async () => {
    const logged = () =>
      db((database) =>
        database
          .select({ value: count() })
          .from(legacyRepairLinkTable)
          .where(eq(legacyRepairLinkTable.runId, runId)),
      );

    const loggedBefore = await logged();
    const invocations = await applyUntilComplete(manifestPath);

    expect(invocations).toEqual([
      expect.objectContaining({ complete: true, processedRows: 0 }),
    ]);
    expect(await logged()).toEqual(loggedBefore);
    // 8 reworked and English NPC links, the per-world link, the link of the
    // revision the API wrote, 3 Polish item links and the retired English
    // revision's link.
    expect(loggedBefore[0]!.value).toBe(14);
  });

  it("invalidates the caches of Organizations whose loots changed", async () => {
    const affected = await run((await repair()).affectedOrganizationIds(runId));

    // A promotion removed per-instance stats shown with loots of any
    // Organization, so every Organization is affected.
    expect(affected).toEqual(
      expect.arrayContaining([affectedGuild, otherGuild]),
    );

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

      const unrelated = crypto.randomUUID();
      const previous = await generations(affectedGuild);

      await run(invalidateLegacyRepairCaches(redis, [affectedGuild]));

      const after = await generations(affectedGuild);

      expect(after.every(Boolean)).toBe(true);
      expect(after).not.toEqual(previous);
      expect(await generations(unrelated)).toEqual([null, null]);
    } finally {
      await redisRuntime.dispose();
    }
  });

  it("rolls back exactly what it changed and keeps records accepted since", async () => {
    const polish210 = (await npcRevisionId("pl", 210))!;

    // A newer loot reuses a created revision, and one relinked link was
    // corrected again after the repair.
    const newerLoot = await insertLoot(polishWorlds[0], new Date());
    const newerLink = await linkNpc(newerLoot, polish210);
    fixture.npcLootIds.push(newerLoot);
    const corrected = fixture.reworkedLootNpcIds.at(-1)!;

    const [elsewhere] = await db((database) =>
      database
        .insert(npcSnapshotTable)
        .values({
          ...npcAttributes,
          lvl: 211,
          gameVersion: "pl",
          snapshotHash: crypto.randomUUID(),
        })
        .returning({ id: npcSnapshotTable.id }),
    );

    await db((database) =>
      database
        .update(lootNpcTable)
        .set({ npcSnapshotId: elsewhere!.id })
        .where(eq(lootNpcTable.id, corrected)),
    );

    const legacyRepair = await repair();

    for (;;) {
      const result = await run(
        legacyRepair.rollback(runId, { batchSize: 2, maxRows: 3 }),
      );

      if (result.complete) break;
    }

    const [npcAfter, itemAfter] = await Promise.all([npcLinks(), itemLinks()]);

    expect(npcAfter.get(corrected)).toBe(elsewhere!.id);
    expect(npcAfter.get(newerLink)).toBe(polish210);
    npcAfter.delete(corrected);
    npcAfter.delete(newerLink);
    linksBefore[0].delete(corrected);
    expect(npcAfter).toEqual(linksBefore[0]);
    expect(itemAfter).toEqual(linksBefore[1]);

    // Every revision this run promoted or retired has its previous identity
    // and stats again. The created Polish level-210 revision stays for the
    // newer loot, as do revisions observed since; the other created
    // revisions are gone.
    const after = await revisions();

    expect(
      after.npcs.filter(
        ({ id }) =>
          ![
            polish210,
            elsewhere!.id,
            fixture.observedEnglishNpcId,
            fixture.concurrentNpcId,
          ].includes(id),
      ),
    ).toEqual(before.npcs);
    expect(after.items).toEqual(before.items);

    // The revision the API wrote has its hash and its loot back.
    const concurrent = after.npcs.find(
      ({ id }) => id === fixture.concurrentNpcId,
    );

    expect(concurrent?.snapshotHash).toBe(
      createNpcSnapshotHash(npcRevision("pl", 183)),
    );
    expect(
      (
        await db((database) =>
          database
            .select({ snapshotId: lootNpcTable.npcSnapshotId })
            .from(lootNpcTable)
            .where(eq(lootNpcTable.id, fixture.concurrentLootNpcId)),
        )
      )[0]?.snapshotId,
    ).toBe(fixture.concurrentNpcId);

    const [selections] = await db((database) =>
      database
        .select({ value: count() })
        .from(notificationRuleUnresolvedSelectionTable)
        .where(eq(notificationRuleUnresolvedSelectionTable.repairRunId, runId)),
    );

    expect(selections!.value).toBe(0);

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
