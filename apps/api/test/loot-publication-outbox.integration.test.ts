import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import {
  NullableLootResponse,
  LootResponse as RuntimeLootResponse,
} from "#src/loots/loot-response.schema";
import {
  LootDetailResponse,
  LootResponse,
  type CreateLootRequest,
} from "#src/contracts/loots/schemas";
import { Permission } from "@lootlog/schema/permissions";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import type { MapPlayersSnapshot } from "#src/contracts/loots/map-players-snapshot";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { and, arrayOverlaps, count, eq, inArray, sql } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import { MessagingError, type PublishOptions } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";
import {
  guildTable,
  lootlogConfigTable,
  lootlogConfigNpcTable,
  memberTable,
  userCharactersLootlogSettingsTable,
  lootTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  itemSnapshotTable,
  npcSnapshotTable,
  lootMapPlayerTable,
  playerSnapshotTable,
  organizationLootRecordTable,
  lootSubmissionTable,
  notificationTargetTable,
  notificationRuleTable,
  notificationJobTable,
} from "#src/database/drizzle/schema";
import {
  makeNotificationJobScheduler,
  type NotificationJobInput,
} from "#src/notifications/jobs/notification-job-scheduler";
import { NotificationJobKind } from "#src/notifications/notification-enums";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import { makeLootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import {
  LootPublicationPayload,
  makeLootPublicationDispatcher,
} from "#src/loots/submission/loot-publication-outbox";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { applicationLogger } from "#src/shared/application-logger";
import { createItemStatsHash } from "@lootlog/database/snapshot-hash";

describe("durable loot publications", () => {
  let runtime = ManagedRuntime.make(ApiDatabaseLive);
  let database: typeof ApiDatabase.Service;
  beforeAll(async () => {
    database = await runtime.runPromise(ApiDatabase);
  });
  afterAll(async () => {
    await runtime.dispose();
  });

  const seed = async (elite2 = false) => {
    const id = randomUUID();
    const now = new Date();
    await runtime.runPromise(
      Effect.gen(function* () {
        yield* database
          .insert(guildTable)
          .values({ id, name: "Outbox test", ownerId: id, updatedAt: now });
        yield* database
          .insert(memberTable)
          .values({ userId: id, guildId: id, name: "Player", updatedAt: now });
        yield* database
          .insert(lootlogConfigTable)
          .values({ id, updatedAt: now });
        yield* database.insert(lootlogConfigNpcTable).values({
          lootlogConfigId: id,
          npcType: elite2 ? "ELITE2" : "HERO",
          allowedRarities: ["HEROIC", "LEGENDARY"],
          updatedAt: now,
        });
        yield* database.insert(userCharactersLootlogSettingsTable).values({
          userId: id,
          accountId: "123",
          characterId: "456",
          catchingGuildIds: [id],
          updatedAt: now,
        });
      }),
    );

    const submission: CreateLootRequest = {
      loots: [
        {
          hid: id,
          id: 8234567,
          name: "Test item",
          icon: "item.png",
          pr: 1,
          prc: "1",
          cl: 1,
          stat: elite2 ? "rarity=legendary;lvl=80" : "rarity=heroic;lvl=80",
        },
      ],
      npcs: [
        {
          id: 8234568,
          name: "Test hero",
          location: "Test map",
          lvl: 80,
          prof: "w",
          wt: elite2 ? 25 : 85,
          icon: "npc.png",
          type: 2,
        },
      ],
      players: [
        {
          id: 456,
          accountId: 123,
          name: "Player",
          lvl: 80,
          prof: "w",
          icon: "player.png",
        },
      ],
      world: "outbox-test",
      source: "FIGHT",
      location: "Test map",
      accountId: "123",
      characterId: "456",
    };

    return { id, request: { discordId: id, submission } };
  };

  const acceptance = (signalPublications: Effect.Effect<void> = Effect.void) =>
    makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        withLock: (_resource, _ttl, _options, effect) => effect,
      },
      signalPublications,
    );

  const pending = (lootId: number) =>
    runtime.runPromise(
      database
        .select()
        .from(lootPublicationOutboxTable)
        .where(eq(lootPublicationOutboxTable.lootId, lootId)),
    );

  const npcSnapshots = (lootId: number) =>
    runtime.runPromise(
      database
        .select({ npc: npcSnapshotTable })
        .from(lootNpcTable)
        .innerJoin(
          npcSnapshotTable,
          eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
        )
        .where(eq(lootNpcTable.lootId, lootId))
        .orderBy(lootNpcTable.id),
    );

  const publications = async (lootId: number) =>
    (await pending(lootId)).map(({ payload }) =>
      Schema.decodeUnknownSync(LootPublicationPayload)(payload),
    );

  const mapPlayerLinks = (guildId: string, lootId: number) =>
    runtime.runPromise(
      database
        .select({
          organizationLootRecordId: lootMapPlayerTable.organizationLootRecordId,
          playerSnapshotId: lootMapPlayerTable.playerSnapshotId,
        })
        .from(lootMapPlayerTable)
        .innerJoin(
          organizationLootRecordTable,
          eq(
            organizationLootRecordTable.id,
            lootMapPlayerTable.organizationLootRecordId,
          ),
        )
        .where(
          and(
            eq(organizationLootRecordTable.guildId, guildId),
            eq(organizationLootRecordTable.lootId, lootId),
          ),
        )
        .orderBy(lootMapPlayerTable.playerSnapshotId),
    );

  const snapshotTestLootIds: number[] = [];
  afterEach(async () => {
    if (snapshotTestLootIds.length === 0) return;
    await runtime.runPromise(
      database
        .delete(lootPublicationOutboxTable)
        .where(
          inArray(lootPublicationOutboxTable.lootId, [...snapshotTestLootIds]),
        ),
    );
    snapshotTestLootIds.length = 0;
  });

  const mapPlayersSnapshot: MapPlayersSnapshot = [
    {
      accountId: 123,
      characterId: 456,
      name: "Map observer",
      prof: "WARRIOR",
      icon: null,
    },
  ];

  const seededGuild = async (guildId: string) => {
    const [guild] = await runtime.runPromise(
      database.select().from(guildTable).where(eq(guildTable.id, guildId)),
    );

    if (!guild) throw new Error("Expected seeded Organization");

    return guild;
  };

  const lootRecord = async (
    guildId: string,
    lootId: number,
    permissions: Permission[] = [Permission.OWNER],
  ) => {
    const guild = await seededGuild(guildId);

    const loot = await runtime.runPromise(
      makeLootQueryOperations(makeLootQueryPersistence(database)).fetchLootById(
        guild,
        permissions,
        [],
        lootId,
      ),
    );

    return Schema.decodeUnknownSync(LootDetailResponse)(
      Schema.encodeSync(NullableLootResponse)(loot),
    );
  };

  const lootList = async (guildId: string) => {
    const guild = await seededGuild(guildId);

    const loots = await runtime.runPromise(
      makeLootQueryOperations(
        makeLootQueryPersistence(database),
      ).fetchLootsByGuildId(guild, [Permission.OWNER], [], {}),
    );

    return Schema.decodeUnknownSync(Schema.Array(LootResponse))(
      Schema.encodeSync(Schema.Array(RuntimeLootResponse))(loots),
    );
  };

  it("retains level revisions and reuses identical NPC observations without rewriting earlier loots", async () => {
    const { id, request } = await seed();
    const npcName = `Versioned hero ${randomUUID()}`;
    const lootIds: number[] = [];

    for (const lvl of [183, 210, 210]) {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((npc) => ({
              ...npc,
              name: npcName,
              lvl,
            })),
          },
        }),
      );

      lootIds.push(result.id);
      snapshotTestLootIds.push(result.id);

      const saved = await npcSnapshots(result.id);
      expect(saved).toHaveLength(1);
      expect(saved[0]?.npc).toMatchObject({ name: npcName, lvl });
      expect((await lootRecord(id, result.id))?.npcs).toMatchObject([
        { name: npcName, lvl },
      ]);

      const intents = await publications(result.id);

      const created = intents.find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE,
      );

      const notification = intents.find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
      );

      const search = intents.find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.SEARCH_NPCS_INDEX,
      );

      const snapshot = saved[0]?.npc;

      if (!snapshot) throw new Error("Expected accepted NPC snapshot");

      expect(created).toMatchObject({
        data: { npcs: [{ lvl, type: "HERO", prof: "WARRIOR", wt: 85 }] },
      });
      expect(notification).toMatchObject({
        data: { npcs: [{ lvl, type: "HERO" }] },
      });
      expect(search).toMatchObject({
        data: [
          {
            id: snapshot.npcId,
            snapshotHash: snapshot.snapshotHash,
            name: snapshot.name,
            lvl: snapshot.lvl,
            type: snapshot.type,
            prof: snapshot.prof,
            icon: snapshot.icon,
            wt: snapshot.wt,
            margonemType: snapshot.margonemType,
            world: snapshot.world,
          },
        ],
      });
    }

    const saved = await Promise.all(lootIds.map(npcSnapshots));
    expect(saved[0]?.[0]?.npc.id).not.toBe(saved[1]?.[0]?.npc.id);
    expect(saved[1]?.[0]?.npc.id).toBe(saved[2]?.[0]?.npc.id);
    expect(saved.map((npcs) => npcs[0]?.npc.lvl)).toEqual([183, 210, 210]);
    expect(
      (await lootList(id)).map((loot) => loot.npcs[0]?.lvl).sort(),
    ).toEqual([183, 210, 210]);
  });

  it.each([
    ["name", { name: "Renamed hero" }, { name: "Renamed hero" }],
    ["icon", { icon: "revised.png" }, { icon: "revised.png" }],
    ["profession", { prof: "m" }, { prof: "MAGE" }],
    ["weight", { wt: 86 }, { wt: 86 }],
    ["Margonem type", { type: 3 }, { margonemType: 3 }],
    ["NPC classification", { wt: 25 }, { type: "ELITE2", wt: 25 }],
  ] satisfies Array<
    [
      string,
      Partial<CreateLootRequest["npcs"][number]>,
      Partial<typeof npcSnapshotTable.$inferSelect>,
    ]
  >)(
    "keeps a separate NPC revision when %s changes",
    async (_attribute, observedChange, persistedChange) => {
      const { id, request } = await seed();
      await runtime.runPromise(
        database.insert(lootlogConfigNpcTable).values({
          lootlogConfigId: id,
          npcType: "ELITE2",
          allowedRarities: ["HEROIC"],
          updatedAt: new Date(),
        }),
      );
      request.submission = {
        ...request.submission,
        world: `npc-revisions-${id}`,
      };
      const first = await runtime.runPromise(acceptance().accept(request));
      snapshotTestLootIds.push(first.id);
      const before = await npcSnapshots(first.id);

      const second = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((npc) => ({
              ...npc,
              ...observedChange,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(second.id);
      const after = await npcSnapshots(second.id);

      expect(after).toHaveLength(1);
      expect(after[0]?.npc).toMatchObject(persistedChange);
      expect(after[0]?.npc.id).not.toBe(before[0]?.npc.id);
      expect(await npcSnapshots(first.id)).toEqual(before);
    },
  );

  it("stores explicit template and runtime NPC identities apart from the overloaded id", async () => {
    const { request } = await seed();
    const name = `Identity hero ${randomUUID()}`;

    const accept = async (npc: Partial<CreateLootRequest["npcs"][number]>) => {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            npcs: request.submission.npcs.map((base) => ({
              ...base,
              name,
              ...npc,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(result.id);

      const [link] = await runtime.runPromise(
        database
          .select({
            runtimeNpcId: lootNpcTable.runtimeNpcId,
            npcId: npcSnapshotTable.npcId,
            identityNamespace: npcSnapshotTable.identityNamespace,
          })
          .from(lootNpcTable)
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(eq(lootNpcTable.lootId, result.id)),
      );

      const search = (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.SEARCH_NPCS_INDEX,
      );

      return { link, search };
    };

    // The template wins over the overloaded id; the spawn stays on the loot.
    expect(
      await accept({ id: 313_103, runtimeId: 313_103, templateId: 257_636 }),
    ).toMatchObject({
      link: {
        runtimeNpcId: 313_103,
        npcId: 257_636,
        identityNamespace: "template",
      },
      search: { data: [{ id: 257_636, identityNamespace: "template" }] },
    });
    // An unresolved template is never filled from the runtime id.
    expect(
      await accept({ id: 313_104, runtimeId: 313_104, templateId: null }),
    ).toMatchObject({
      link: {
        runtimeNpcId: 313_104,
        npcId: 313_104,
        identityNamespace: "runtime",
      },
      search: { data: [{ id: 313_104, identityNamespace: "runtime" }] },
    });
    // Older clients keep their overloaded id in the legacy namespace.
    expect(await accept({ id: 257_636 })).toMatchObject({
      link: { runtimeNpcId: null, npcId: 257_636, identityNamespace: "legacy" },
      search: { data: [{ id: 257_636, identityNamespace: "legacy" }] },
    });
  });

  it("stores the declared game version on the loot, its NPC revision and search publication", async () => {
    const { request } = await seed();
    const name = `Game version hero ${randomUUID()}`;

    const accept = async (
      gameVersion: CreateLootRequest["gameVersion"],
      hids = request.submission.loots.map(() => randomUUID()),
    ) => {
      const { gameVersion: _omitted, ...base } = request.submission;

      const observed: CreateLootRequest = {
        ...base,
        loots: request.submission.loots.map((item, index) => ({
          ...item,
          hid: hids[index] ?? randomUUID(),
        })),
        npcs: request.submission.npcs.map((npc) => ({
          ...npc,
          name,
          templateId: 257_636,
        })),
      };

      // Older clients omit the field; `undefined` stands for that request.
      const submission =
        gameVersion === undefined ? observed : { ...observed, gameVersion };

      const result = await runtime.runPromise(
        acceptance().accept({ ...request, submission }),
      );

      snapshotTestLootIds.push(result.id);

      const [stored] = await runtime.runPromise(
        database
          .select({
            lootGameVersion: lootTable.gameVersion,
            snapshotId: npcSnapshotTable.id,
            snapshotGameVersion: npcSnapshotTable.gameVersion,
          })
          .from(lootTable)
          .innerJoin(lootNpcTable, eq(lootNpcTable.lootId, lootTable.id))
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(eq(lootTable.id, result.id)),
      );

      const search = (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.SEARCH_NPCS_INDEX,
      );

      return { hids, id: result.id, search, stored };
    };

    const polish = await accept("pl");
    const english = await accept("en");

    expect(polish).toMatchObject({
      stored: { lootGameVersion: "pl", snapshotGameVersion: "pl" },
      search: { data: [{ id: 257_636, gameVersion: "pl" }] },
    });
    expect(english).toMatchObject({
      stored: { lootGameVersion: "en", snapshotGameVersion: "en" },
      search: { data: [{ id: 257_636, gameVersion: "en" }] },
    });
    // Equal template ids from different editions never share a revision.
    expect(english.stored?.snapshotId).not.toBe(polish.stored?.snapshotId);

    // Older clients and unrecognized hosts stay unknown, never Polish.
    for (const gameVersion of [undefined, null] as const) {
      expect(await accept(gameVersion)).toMatchObject({
        stored: { lootGameVersion: null, snapshotGameVersion: null },
        search: { data: [{ id: 257_636, gameVersion: null }] },
      });
    }

    // A retry of an accepted loot keeps the provenance it was accepted with.
    const retry = await accept("en", polish.hids);
    expect(retry.id).toBe(polish.id);
    expect(retry.stored).toEqual(polish.stored);
  });

  it("keeps each observed item name and icon on its loot and per-instance stats on the looted item", async () => {
    const { id, request } = await seed();
    const itemId = 9_000_000 + randomInt(1_000_000);
    const revisionStat = "rarity=heroic;lvl=80;contra=40";

    // Stored before revisions: first-writer English presentation, no hash.
    const [legacy] = await runtime.runPromise(
      database
        .insert(itemSnapshotTable)
        .values({
          itemId,
          statsHash: createItemStatsHash(revisionStat),
          name: "Seth's War Trophy",
          icon: "trophy.gif",
          lvl: 80,
          rarity: "HEROIC",
          statRaw: `${revisionStat};created=1`,
          statsSnapshot: {},
        })
        .returning(),
    );

    if (!legacy) throw new Error("Expected legacy item snapshot");

    const accept = async (
      item: { name: string; icon: string; instanceStat: string },
      hids = [randomUUID()],
    ) => {
      const result = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            gameVersion: "pl",
            loots: request.submission.loots.map((base, index) => ({
              ...base,
              hid: hids[index] ?? randomUUID(),
              id: itemId,
              name: item.name,
              icon: item.icon,
              stat: `${item.instanceStat};${revisionStat}`,
            })),
          },
        }),
      );

      snapshotTestLootIds.push(result.id);

      const [stored] = await runtime.runPromise(
        database
          .select({
            instanceStat: lootItemTable.instanceStat,
            snapshot: itemSnapshotTable,
          })
          .from(lootItemTable)
          .innerJoin(
            itemSnapshotTable,
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
          )
          .where(eq(lootItemTable.lootId, result.id)),
      );

      const search = (await publications(result.id)).find(
        (intent) =>
          intent.kind === "rabbit" &&
          intent.routingKey === RabbitRoutingKey.SEARCH_ITEMS_INDEX,
      );

      return {
        hids,
        id: result.id,
        search,
        stored,
        item: (await lootRecord(id, result.id))?.items[0],
      };
    };

    const english = await accept({
      name: "Seth's War Trophy",
      icon: "trophy.gif",
      instanceStat: "created=100;amount=1",
    });

    const polish = await accept({
      name: "Wojenne trofeum Seta",
      icon: "trophy.gif",
      instanceStat: "created=200;amount=3",
    });

    const polishAgain = await accept({
      name: "Wojenne trofeum Seta",
      icon: "trophy.gif",
      instanceStat: "created=300;amount=5;opis=Zdobyte przez Gracza",
    });

    const newIcon = await accept({
      name: "Wojenne trofeum Seta",
      icon: "trophy-v2.gif",
      instanceStat: "created=400",
    });

    // Equal stats never lend one language's presentation to another, and an
    // identical presentation reuses its revision whatever the instance stats.
    expect(english.stored?.snapshot.id).not.toBe(legacy.id);
    expect(polish.stored?.snapshot.id).not.toBe(english.stored?.snapshot.id);
    expect(polishAgain.stored?.snapshot.id).toBe(polish.stored?.snapshot.id);
    expect(newIcon.stored?.snapshot.id).not.toBe(polish.stored?.snapshot.id);
    expect(polishAgain.stored?.snapshot).toMatchObject({
      name: "Wojenne trofeum Seta",
      gameVersion: "pl",
      statRaw: revisionStat,
    });
    expect(polishAgain.stored?.instanceStat).toBe(
      "created=300;amount=5;opis=Zdobyte przez Gracza",
    );

    // Each loot shows its own presentation and its own instance values.
    expect(
      [english, polish, polishAgain, newIcon].map(({ item }) => [
        item?.name,
        item?.icon,
        item?.stat,
      ]),
    ).toEqual([
      [
        "Seth's War Trophy",
        "trophy.gif",
        `${revisionStat};created=100;amount=1`,
      ],
      [
        "Wojenne trofeum Seta",
        "trophy.gif",
        `${revisionStat};created=200;amount=3`,
      ],
      [
        "Wojenne trofeum Seta",
        "trophy.gif",
        `${revisionStat};created=300;amount=5;opis=Zdobyte przez Gracza`,
      ],
      ["Wojenne trofeum Seta", "trophy-v2.gif", `${revisionStat};created=400`],
    ]);
    expect(polish.search).toMatchObject({
      data: [
        {
          id: itemId,
          name: "Wojenne trofeum Seta",
          stat: revisionStat,
          gameVersion: "pl",
        },
      ],
    });

    // A retry with another presentation keeps the accepted loot unchanged.
    const retry = await accept(
      {
        name: "Wojenne trofeum Seta",
        icon: "trophy.gif",
        instanceStat: "created=100;amount=1",
      },
      english.hids,
    );

    expect(retry.id).toBe(english.id);
    expect(retry.stored).toEqual(english.stored);
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(itemSnapshotTable)
          .where(eq(itemSnapshotTable.id, legacy.id)),
      ),
    ).toEqual([legacy]);
  });

  it("preserves an ambiguous legacy NPC row while accepting a new observed revision", async () => {
    const { id, request } = await seed();
    const name = `Legacy hero ${id}`;

    const [legacy] = await runtime.runPromise(
      database
        .insert(npcSnapshotTable)
        .values({
          npcId: 8234568,
          name,
          type: "HERO",
          lvl: 183,
          icon: "legacy.png",
          prof: "WARRIOR",
          wt: 85,
          margonemType: 2,
        })
        .returning(),
    );

    if (!legacy) throw new Error("Expected legacy NPC snapshot");

    const result = await runtime.runPromise(
      acceptance().accept({
        ...request,
        submission: {
          ...request.submission,
          npcs: request.submission.npcs.map((npc) => ({
            ...npc,
            name,
            lvl: 210,
          })),
        },
      }),
    );

    snapshotTestLootIds.push(result.id);

    const saved = await npcSnapshots(result.id);
    expect(saved[0]?.npc).toMatchObject({ name, lvl: 210, icon: "npc.png" });
    expect(saved[0]?.npc.id).not.toBe(legacy.id);
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(npcSnapshotTable)
          .where(eq(npcSnapshotTable.id, legacy.id)),
      ),
    ).toEqual([legacy]);
  });

  it("reuses concurrent NPC revisions while retaining each loot's submitted roster order", async () => {
    const { id, request } = await seed();
    const primary = request.submission.npcs[0];

    if (!primary) throw new Error("Expected seeded NPC observation");

    const observations = [
      primary,
      { ...primary, id: primary.id + 1, name: "Second observed hero", wt: 86 },
    ];

    const rosters = [observations, observations.toReversed(), observations];

    const accepted = await Promise.all(
      rosters.map((npcs) =>
        runtime.runPromise(
          acceptance().accept({
            ...request,
            submission: {
              ...request.submission,
              npcs,
              world: `concurrent-npc-${id}`,
              loots: request.submission.loots.map((item) => ({
                ...item,
                hid: randomUUID(),
              })),
            },
          }),
        ),
      ),
    );

    snapshotTestLootIds.push(...accepted.map((loot) => loot.id));
    expect(new Set(accepted.map((loot) => loot.id)).size).toBe(3);

    const linked = await Promise.all(
      accepted.map((loot) => npcSnapshots(loot.id)),
    );

    expect(linked.every((npcs) => npcs.length === 2)).toBe(true);
    expect(
      new Set(linked.flatMap((npcs) => npcs.map(({ npc }) => npc.id))).size,
    ).toBe(2);
    expect(linked.map((npcs) => npcs.map(({ npc }) => npc.npcId))).toEqual(
      rosters.map((npcs) => npcs.map((npc) => npc.id)),
    );

    const returned = await Promise.all(
      accepted.map((loot) => lootRecord(id, loot.id)),
    );

    expect(returned.map((loot) => loot?.npcs.map((npc) => npc.id))).toEqual(
      rosters.map((npcs) => npcs.map((npc) => npc.id)),
    );
  });

  it("publishes persisted NPC visibility when another Organization retries a loot with changed NPC data", async () => {
    const first = await seed();
    const second = await seed();
    first.request.submission = {
      ...first.request.submission,
      npcs: first.request.submission.npcs.map((npc) => ({
        ...npc,
        name: `Retry hero ${first.id}`,
        lvl: 183,
      })),
    };

    const accepted = await runtime.runPromise(
      acceptance().accept(first.request),
    );

    snapshotTestLootIds.push(accepted.id);
    second.request.submission = {
      ...first.request.submission,
      npcs: first.request.submission.npcs.map((npc) => ({
        ...npc,
        lvl: 210,
        prof: "m",
        wt: 86,
      })),
    };

    const appended = await runtime.runPromise(
      acceptance().accept(second.request),
    );

    expect(appended.id).toBe(accepted.id);
    expect((await lootRecord(second.id, accepted.id))?.npcs).toMatchObject([
      { lvl: 183, prof: "WARRIOR", type: "HERO", wt: 85 },
    ]);

    const created = (await publications(accepted.id)).filter(
      (intent) =>
        intent.kind === "rabbit" &&
        intent.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE,
    );

    expect(created).toHaveLength(2);

    for (const publication of created) {
      expect(publication).toMatchObject({
        data: {
          npcs: [{ lvl: 183, prof: "WARRIOR", type: "HERO", wt: 85 }],
        },
      });
    }
  });

  it("persists map players for legendary elite2 and keeps Organization observations isolated", async () => {
    const first = await seed(true);
    const second = await seed(true);
    const unrelated = await seed(true);
    first.request.submission = {
      ...first.request.submission,
      mapPlayersSnapshot,
    };
    const result = await runtime.runPromise(acceptance().accept(first.request));
    snapshotTestLootIds.push(result.id);

    const secondSnapshot = [
      {
        ...mapPlayersSnapshot[0],
        accountId: 222,
        characterId: 333,
        name: "Other Organization observer",
      },
    ] satisfies MapPlayersSnapshot;

    second.request.submission = {
      ...second.request.submission,
      loots: first.request.submission.loots,
      mapPlayersSnapshot: secondSnapshot,
    };
    expect(
      (await runtime.runPromise(acceptance().accept(second.request))).id,
    ).toBe(result.id);
    expect((await lootRecord(first.id, result.id))?.mapPlayersSnapshot).toEqual(
      mapPlayersSnapshot,
    );
    expect(
      (await lootRecord(second.id, result.id))?.mapPlayersSnapshot,
    ).toEqual(secondSnapshot);
    expect(await lootRecord(first.id, result.id, [])).toBeNull();
    expect(await lootRecord(unrelated.id, result.id)).toBeNull();
    expect(
      (await lootList(first.id)).map((loot) => loot.mapPlayersSnapshot),
    ).toEqual([mapPlayersSnapshot]);
    expect(
      (await lootList(second.id)).map((loot) => loot.mapPlayersSnapshot),
    ).toEqual([secondSnapshot]);
    expect(await lootList(unrelated.id)).toEqual([]);
    await runtime.runPromise(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: new Date() })
        .where(eq(organizationLootRecordTable.guildId, first.id)),
    );
    expect(await lootRecord(first.id, result.id)).toBeNull();
    expect(
      (await lootRecord(second.id, result.id))?.mapPlayersSnapshot,
    ).toEqual(secondSnapshot);
  });

  it.each([1, 2])(
    "accepts concurrent loots with opposite participants, overlapping item and NPC snapshots, and the same map roster (round %j)",
    async () => {
      const first = await seed(true);
      const second = await seed(true);
      const world = `concurrent-map-${randomUUID()}`;

      const playerA = {
        accountId: randomInt(1, 1_000_000),
        characterId: randomInt(1, 1_000_000),
        name: `Player A ${randomUUID()}`,
        prof: "WARRIOR" as const,
        icon: "player-a.png",
      };

      const playerB = {
        accountId: randomInt(1_000_001, 2_000_000),
        characterId: randomInt(1_000_001, 2_000_000),
        name: `Player B ${randomUUID()}`,
        prof: "MAGE" as const,
        icon: "player-b.png",
      };

      const [baseItem] = first.request.submission.loots;
      const [baseNpc] = first.request.submission.npcs;

      if (!baseItem || !baseNpc) throw new Error("Expected seeded loot");

      const itemX = { ...baseItem, id: randomInt(10_000_000, 20_000_000) };
      const itemY = { ...baseItem, id: itemX.id + 1 };

      const npcP = {
        ...baseNpc,
        id: randomInt(10_000_000, 20_000_000),
        name: randomUUID(),
      };

      const npcQ = { ...npcP, id: npcP.id + 1 };

      // Opposite orders and repeated identical items make both loots contend
      // for the same snapshot keys while each instance keeps its own link.
      const items = (...templates: Array<typeof itemX>) =>
        templates.map((item) => ({ ...item, hid: randomUUID() }));

      first.request.submission = {
        ...first.request.submission,
        world,
        npcs: [npcP, npcQ],
        loots: items(itemX, itemX, itemY),
        players: [{ ...playerA, id: playerA.characterId, prof: "w", lvl: 80 }],
        mapPlayersSnapshot: [playerA, playerB],
      };
      second.request.submission = {
        ...second.request.submission,
        world,
        npcs: [npcQ, npcP],
        loots: items(itemY, itemX, itemY),
        players: [{ ...playerB, id: playerB.characterId, prof: "m", lvl: 80 }],
        mapPlayersSnapshot: [playerB, playerA],
      };

      const [firstResult, secondResult] = await Promise.all(
        [first.request, second.request].map(async (request) => {
          const result = await runtime.runPromise(acceptance().accept(request));
          snapshotTestLootIds.push(result.id);

          return result;
        }),
      );

      if (!firstResult || !secondResult)
        throw new Error("Expected both accepted loots");
      expect(firstResult.id).not.toBe(secondResult.id);

      const snapshots = await runtime.runPromise(
        database
          .select()
          .from(playerSnapshotTable)
          .where(eq(playerSnapshotTable.world, world)),
      );

      expect(snapshots).toHaveLength(2);

      const itemSnapshots = await runtime.runPromise(
        database
          .select({
            id: itemSnapshotTable.id,
            itemId: itemSnapshotTable.itemId,
          })
          .from(itemSnapshotTable)
          .where(inArray(itemSnapshotTable.itemId, [itemX.id, itemY.id])),
      );

      const npcSnapshots = await runtime.runPromise(
        database
          .select({ id: npcSnapshotTable.id, npcId: npcSnapshotTable.npcId })
          .from(npcSnapshotTable)
          .where(inArray(npcSnapshotTable.npcId, [npcP.id, npcQ.id])),
      );

      expect(itemSnapshots).toHaveLength(2);
      expect(npcSnapshots).toHaveLength(2);

      const itemSnapshotId = new Map(
        itemSnapshots.map((snapshot) => [snapshot.itemId, snapshot.id]),
      );

      const npcSnapshotId = new Map(
        npcSnapshots.map((snapshot) => [snapshot.npcId, snapshot.id]),
      );

      for (const [request, result] of [
        [first.request, firstResult],
        [second.request, secondResult],
      ] as const) {
        const lootItems = await runtime.runPromise(
          database
            .select({
              hid: lootItemTable.hid,
              itemSnapshotId: lootItemTable.itemSnapshotId,
            })
            .from(lootItemTable)
            .where(eq(lootItemTable.lootId, result.id))
            .orderBy(lootItemTable.id),
        );

        const lootNpcs = await runtime.runPromise(
          database
            .select({ npcSnapshotId: lootNpcTable.npcSnapshotId })
            .from(lootNpcTable)
            .where(eq(lootNpcTable.lootId, result.id))
            .orderBy(lootNpcTable.id),
        );

        expect(lootItems).toEqual(
          request.submission.loots.map((item) => ({
            hid: item.hid,
            itemSnapshotId: itemSnapshotId.get(item.id),
          })),
        );
        expect(lootNpcs).toEqual(
          request.submission.npcs.map((npc) => ({
            npcSnapshotId: npcSnapshotId.get(npc.id),
          })),
        );
      }

      const snapshotA = snapshots.find(
        (player) => player.characterId === playerA.characterId,
      );

      const snapshotB = snapshots.find(
        (player) => player.characterId === playerB.characterId,
      );

      if (!snapshotA || !snapshotB)
        throw new Error("Expected both player snapshots");
      await Promise.all(
        (
          [
            [first.id, firstResult, snapshotA],
            [second.id, secondResult, snapshotB],
          ] as const
        ).map(async ([guildId, result, participant]) => {
          const links = await mapPlayerLinks(guildId, result.id);
          expect(links).toHaveLength(2);
          expect(new Set(links.map((link) => link.playerSnapshotId))).toEqual(
            new Set([snapshotA.id, snapshotB.id]),
          );

          const participants = await runtime.runPromise(
            database
              .select()
              .from(lootPlayerTable)
              .where(eq(lootPlayerTable.lootId, result.id)),
          );

          expect(participants).toHaveLength(1);
          expect(participants[0]?.playerSnapshotId).toBe(participant.id);
          expect(
            (await lootRecord(guildId, result.id))?.mapPlayersSnapshot,
          ).toEqual([playerA, playerB]);
        }),
      );
    },
  );

  it.each([false, true])(
    "reuses participant snapshots across scoped Organization links (legacy CLI snapshot: %j)",
    async (legacySnapshot) => {
      const first = await seed(true);
      const second = await seed(true);

      const observers: MapPlayersSnapshot = [
        {
          accountId: 123,
          characterId: 456,
          name: "Player",
          prof: "WARRIOR",
          icon: "player.png",
        },
      ];

      first.request.submission = {
        ...first.request.submission,
        world: `outbox-test-${first.id}`,
        mapPlayersSnapshot: observers,
      };
      let legacySnapshotId: number | undefined;

      if (legacySnapshot) {
        const player = observers[0];

        if (!player) throw new Error("Expected map observer");

        const inserted = await runtime.runPromise(
          database
            .insert(playerSnapshotTable)
            .values({
              ...player,
              world: first.request.submission.world,
              snapshotHash: createHash("sha256")
                .update(`${player.name}${player.prof}${player.icon}`)
                .digest("hex"),
            })
            .returning(),
        );

        legacySnapshotId = inserted[0]?.id;
        expect(legacySnapshotId).toBeDefined();
      }

      const result = await runtime.runPromise(
        acceptance().accept(first.request),
      );

      snapshotTestLootIds.push(result.id);
      second.request.submission = first.request.submission;
      await runtime.runPromise(acceptance().accept(second.request));

      const participants = await runtime.runPromise(
        database
          .select()
          .from(lootPlayerTable)
          .where(eq(lootPlayerTable.lootId, result.id)),
      );

      expect(participants).toHaveLength(1);
      const participant = participants[0];

      if (!participant) throw new Error("Expected fight participant");

      if (legacySnapshot)
        expect(participant.playerSnapshotId).toBe(legacySnapshotId);
      const firstLinks = await mapPlayerLinks(first.id, result.id);
      const secondLinks = await mapPlayerLinks(second.id, result.id);
      expect(firstLinks).toHaveLength(1);
      expect(secondLinks).toHaveLength(1);
      expect(firstLinks[0]?.playerSnapshotId).toBe(
        participant.playerSnapshotId,
      );
      expect(secondLinks[0]?.playerSnapshotId).toBe(
        participant.playerSnapshotId,
      );
      expect(firstLinks[0]?.organizationLootRecordId).not.toBe(
        secondLinks[0]?.organizationLootRecordId,
      );
      expect(
        await runtime.runPromise(
          database
            .select()
            .from(playerSnapshotTable)
            .where(
              eq(playerSnapshotTable.world, first.request.submission.world),
            ),
        ),
      ).toHaveLength(1);
      expect(
        (await lootRecord(first.id, result.id))?.mapPlayersSnapshot,
      ).toEqual(observers);
      expect(
        (await lootRecord(second.id, result.id))?.mapPlayersSnapshot,
      ).toEqual(observers);
    },
  );

  it("accepts map observers whose legacy concatenated hash collides without changing historical snapshots", async () => {
    const { id, request } = await seed(true);

    const legacyObserver = {
      accountId: 321,
      characterId: 654,
      name: "Foo",
      prof: "WARRIOR" as const,
      icon: "outfit.gif",
    };

    const observer = { ...legacyObserver, name: "Foow", prof: null };
    const world = `hash-collision-${id}`;

    const legacyHash = createHash("sha256")
      .update("Foowoutfit.gif")
      .digest("hex");

    const [legacy] = await runtime.runPromise(
      database
        .insert(playerSnapshotTable)
        .values({ ...legacyObserver, world, snapshotHash: legacyHash })
        .returning(),
    );

    if (!legacy) throw new Error("Expected historical player snapshot");
    request.submission = {
      ...request.submission,
      world,
      mapPlayersSnapshot: [observer],
    };
    const created = await runtime.runPromise(acceptance().accept(request));
    snapshotTestLootIds.push(created.id);
    expect((await lootRecord(id, created.id))?.mapPlayersSnapshot).toEqual([
      observer,
    ]);
    const newLinks = await mapPlayerLinks(id, created.id);
    expect(newLinks[0]?.playerSnapshotId).not.toBe(legacy.id);
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(playerSnapshotTable)
          .where(eq(playerSnapshotTable.id, legacy.id)),
      ),
    ).toEqual([legacy]);

    request.submission = {
      ...request.submission,
      loots: request.submission.loots.map((item) => ({
        ...item,
        hid: randomUUID(),
      })),
      mapPlayersSnapshot: [legacyObserver],
    };
    const later = await runtime.runPromise(acceptance().accept(request));
    snapshotTestLootIds.push(later.id);
    expect((await mapPlayerLinks(id, later.id))[0]?.playerSnapshotId).toBe(
      legacy.id,
    );
    expect((await lootRecord(id, later.id))?.mapPlayersSnapshot).toEqual([
      legacyObserver,
    ]);
  });

  it.each([
    { name: "Renamed player" },
    { prof: "MAGE" as const },
    { icon: "new-outfit.png" },
  ])(
    "preserves old map presence when player snapshot attributes change: %j",
    async (change) => {
      const { id, request } = await seed(true);

      const original = {
        accountId: 123,
        characterId: 456,
        name: "Player",
        prof: "WARRIOR" as const,
        icon: "player.png",
      };

      request.submission = {
        ...request.submission,
        world: `outbox-test-${id}`,
        mapPlayersSnapshot: [original],
      };
      const first = await runtime.runPromise(acceptance().accept(request));
      snapshotTestLootIds.push(first.id);
      const changed = { ...original, ...change };

      const second = await runtime.runPromise(
        acceptance().accept({
          ...request,
          submission: {
            ...request.submission,
            loots: request.submission.loots.map((item) => ({
              ...item,
              hid: randomUUID(),
            })),
            mapPlayersSnapshot: [changed],
          },
        }),
      );

      snapshotTestLootIds.push(second.id);
      expect(second.id).not.toBe(first.id);
      const originalLinks = await mapPlayerLinks(id, first.id);
      const changedLinks = await mapPlayerLinks(id, second.id);
      expect(originalLinks).toHaveLength(1);
      expect(changedLinks).toHaveLength(1);
      expect(originalLinks[0]?.playerSnapshotId).not.toBe(
        changedLinks[0]?.playerSnapshotId,
      );

      const storedSnapshots = await runtime.runPromise(
        database
          .select()
          .from(playerSnapshotTable)
          .where(eq(playerSnapshotTable.world, request.submission.world)),
      );

      expect(storedSnapshots).toHaveLength(2);
      expect(storedSnapshots).toEqual(
        expect.arrayContaining([
          expect.objectContaining(original),
          expect.objectContaining(changed),
        ]),
      );
      expect((await lootRecord(id, first.id))?.mapPlayersSnapshot).toEqual([
        original,
      ]);
      expect((await lootRecord(id, second.id))?.mapPlayersSnapshot).toEqual([
        changed,
      ]);
    },
  );

  it("fills a missing snapshot on same-member retry once, atomically, without duplicating submissions", async () => {
    const { id, request } = await seed(true);
    const result = await runtime.runPromise(acceptance().accept(request));
    snapshotTestLootIds.push(result.id);
    expect((await lootRecord(id, result.id))?.mapPlayersSnapshot).toBeNull();
    expect(await mapPlayerLinks(id, result.id)).toEqual([]);

    const firstSnapshot = [
      ...mapPlayersSnapshot,
      { ...mapPlayersSnapshot[0], characterId: 1001, name: "First witness" },
    ] satisfies MapPlayersSnapshot;

    const otherSnapshot = [
      { ...mapPlayersSnapshot[0], name: "Later observer" },
      { ...mapPlayersSnapshot[0], characterId: 1002, name: "Second witness" },
      { ...mapPlayersSnapshot[0], characterId: 1003, name: "Third witness" },
    ] satisfies MapPlayersSnapshot;

    await Promise.all(
      [firstSnapshot, otherSnapshot].map((snapshot) =>
        runtime.runPromise(
          acceptance().accept({
            ...request,
            submission: { ...request.submission, mapPlayersSnapshot: snapshot },
          }),
        ),
      ),
    );
    const saved = (await lootRecord(id, result.id))?.mapPlayersSnapshot;

    if (!saved) throw new Error("Expected winning map snapshot");
    expect([firstSnapshot, otherSnapshot]).toContainEqual([...saved]);
    const linksBeforeRetry = await mapPlayerLinks(id, result.id);
    expect(linksBeforeRetry).toHaveLength(saved.length);
    const intentsBeforeRetry = (await pending(result.id)).length;
    await runtime.runPromise(
      acceptance().accept({
        ...request,
        submission: {
          ...request.submission,
          mapPlayersSnapshot: otherSnapshot,
        },
      }),
    );
    expect((await lootRecord(id, result.id))?.mapPlayersSnapshot).toEqual(
      saved,
    );
    expect(await mapPlayerLinks(id, result.id)).toEqual(linksBeforeRetry);
    expect((await lootRecord(id, result.id))?.submissions).toHaveLength(1);
    expect(await pending(result.id)).toHaveLength(intentsBeforeRetry);
  });

  it("ignores map snapshots for other NPC types, rarities, and loot sources", async () => {
    await Promise.all(
      (["hero", "heroic", "dialog"] as const).map(async (variant) => {
        const { id, request } = await seed(variant !== "hero");
        request.submission = {
          ...request.submission,
          mapPlayersSnapshot,
          source: variant === "dialog" ? "DIALOG" : "FIGHT",
          loots: request.submission.loots.map((item) => ({
            ...item,
            stat:
              variant === "heroic"
                ? "rarity=heroic;lvl=80"
                : "rarity=legendary;lvl=80",
          })),
        };
        const result = await runtime.runPromise(acceptance().accept(request));
        snapshotTestLootIds.push(result.id);
        expect(
          (await lootRecord(id, result.id))?.mapPlayersSnapshot,
        ).toBeNull();
        expect(await mapPlayerLinks(id, result.id)).toEqual([]);
      }),
    );
  });

  it("commits intents with the loot, survives publish failure/restart, and does not duplicate on submission retry", async () => {
    const { id, request } = await seed();
    const result = await runtime.runPromise(acceptance().accept(request));
    expect((await pending(result.id)).length).toBe(6);
    const sent: PublishOptions[] = [];
    const invalidated: string[][] = [];

    const dispatch = makeLootPublicationDispatcher(
      database,
      {
        publish: (message) =>
          message.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE
            ? Effect.fail(
                new MessagingError({
                  operation: "publish",
                  message: "Broker unavailable",
                  cause: undefined,
                }),
              )
            : Effect.sync(() => {
                sent.push(message);
              }),
      },
      () => Effect.fail(new Error("Cache unavailable")),
    );

    await runtime.runPromise(dispatch());
    expect(invalidated).toEqual([]);
    expect(await pending(result.id)).toHaveLength(2);
    expect(await runtime.runPromise(acceptance().accept(request))).toEqual(
      result,
    );
    expect(await pending(result.id)).toHaveLength(2);

    await runtime.dispose();
    runtime = ManagedRuntime.make(ApiDatabaseLive);
    database = await runtime.runPromise(ApiDatabase);

    const recovered = makeLootPublicationDispatcher(
      database,
      {
        publish: (message) =>
          Effect.sync(() => {
            sent.push(message);
          }),
      },
      (ids) =>
        Effect.sync(() => {
          invalidated.push(ids);
        }),
    );

    await runtime.runPromise(
      Effect.all([recovered(), recovered()], { concurrency: 2 }),
    );
    await runtime.runPromise(acceptance().accept(request));
    await runtime.runPromise(recovered());
    expect(await pending(result.id)).toHaveLength(0);
    expect(invalidated).toEqual([[id]]);
    expect(sent.map((message) => message.routingKey).sort()).toEqual(
      [
        RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        RabbitRoutingKey.SEARCH_PLAYERS_INDEX,
        RabbitRoutingKey.SEARCH_NPCS_INDEX,
        RabbitRoutingKey.SEARCH_ITEMS_INDEX,
        RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
      ].sort(),
    );
    expect(
      await runtime.runPromise(
        database
          .select({ value: count() })
          .from(lootTable)
          .where(eq(lootTable.id, result.id)),
      ),
    ).toEqual([{ value: 1 }]);

    const records = await runtime.runPromise(
      database
        .select()
        .from(organizationLootRecordTable)
        .where(eq(organizationLootRecordTable.lootId, result.id)),
    );

    expect(records).toHaveLength(1);
    const record = records[0];

    if (!record) throw new Error("Accepted Organization record is missing");
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(lootSubmissionTable)
          .where(eq(lootSubmissionTable.organizationLootRecordId, record.id)),
      ),
    ).toHaveLength(1);
  });

  it("atomically adds publication intents when another Organization accepts an existing loot", async () => {
    const first = await seed();
    const second = await seed();

    const accepted = await runtime.runPromise(
      acceptance().accept(first.request),
    );

    const additionalRequest = {
      ...second.request,
      submission: first.request.submission,
    };

    const additional = await runtime.runPromise(
      acceptance().accept(additionalRequest),
    );

    expect(additional.id).toBe(accepted.id);
    expect(additional.submittedGuilds.map((guild) => guild.guildId)).toEqual([
      second.id,
    ]);
    expect(await pending(accepted.id)).toHaveLength(8);
    await runtime.runPromise(acceptance().accept(additionalRequest));
    expect(await pending(accepted.id)).toHaveLength(8);
    const organizations: string[] = [];
    await runtime.runPromise(
      makeLootPublicationDispatcher(
        database,
        {
          publish: (message) =>
            Effect.sync(() => {
              if (message.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE) {
                const payload: { guildId: string } = JSON.parse(
                  new TextDecoder().decode(message.content),
                );

                organizations.push(payload.guildId);
              }
            }),
        },
        () => Effect.void,
      )(),
    );
    expect(organizations.sort()).toEqual([first.id, second.id].sort());
    expect(await pending(accepted.id)).toEqual([]);
  });

  it("rolls back the durable loot when persisting its publication intent fails", async () => {
    const { request } = await seed();
    let signals = 0;

    const signal = Effect.sync(() => {
      signals += 1;
    });

    const before = await runtime.runPromise(
      database.select({ value: count() }).from(lootTable),
    );

    await runtime.runPromise(
      database.execute(
        sql`CREATE FUNCTION reject_test_loot_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected outbox failure'; END $$`,
      ),
    );
    await runtime.runPromise(
      database.execute(
        sql`CREATE TRIGGER reject_test_loot_publication BEFORE INSERT ON "LootPublicationOutbox" FOR EACH ROW EXECUTE FUNCTION reject_test_loot_publication()`,
      ),
    );

    try {
      const result = await runtime.runPromise(
        Effect.exit(acceptance(signal).accept(request)),
      );

      expect(result._tag).toBe("Failure");
      expect(signals).toBe(0);
      expect(
        await runtime.runPromise(
          database.select({ value: count() }).from(lootTable),
        ),
      ).toEqual(before);
    } finally {
      await runtime.runPromise(
        database.execute(
          sql`DROP TRIGGER reject_test_loot_publication ON "LootPublicationOutbox"`,
        ),
      );
      await runtime.runPromise(
        database.execute(sql`DROP FUNCTION reject_test_loot_publication()`),
      );
    }
  });

  it("signals committed new and appended Organization publications before acceptance returns", async () => {
    const first = await seed();
    const second = await seed();
    const observations: string[][] = [];

    const signal = database
      .select({ organizationIds: lootPublicationOutboxTable.organizationIds })
      .from(lootPublicationOutboxTable)
      .where(
        arrayOverlaps(lootPublicationOutboxTable.organizationIds, [
          first.id,
          second.id,
        ]),
      )
      .pipe(
        Effect.tap((rows) =>
          Effect.sync(() => {
            observations.push([
              ...new Set(rows.flatMap((row) => row.organizationIds)),
            ]);
          }),
        ),
        Effect.asVoid,
        Effect.orDie,
      );

    const accepted = await runtime.runPromise(
      acceptance(signal).accept(first.request),
    );

    snapshotTestLootIds.push(accepted.id);
    expect(observations).toEqual([[first.id]]);
    await runtime.runPromise(acceptance(signal).accept(first.request));
    expect(observations).toEqual([[first.id]]);

    await runtime.runPromise(
      acceptance(signal).accept({
        discordId: second.id,
        submission: first.request.submission,
      }),
    );
    expect(observations[1]?.sort()).toEqual([first.id, second.id].sort());
  });

  it("reuses the pending notification job when queueing failed after its database commit", async () => {
    const { id } = await seed();
    const now = new Date();

    const [target] = await runtime.runPromise(
      database
        .insert(notificationTargetTable)
        .values({
          ownerType: "USER",
          ownerId: id,
          provider: "DISCORD",
          targetType: "DM",
          externalId: id,
          updatedAt: now,
        })
        .returning(),
    );

    const [rule] = await runtime.runPromise(
      database
        .insert(notificationRuleTable)
        .values({
          ownerType: "USER",
          ownerId: id,
          triggerType: "WATCHED_ITEM_DROPPED",
          updatedAt: now,
        })
        .returning(),
    );

    if (!target || !rule) throw new Error("Notification seed failed");

    const input: NotificationJobInput = {
      notificationRule: rule,
      target,
      jobKind: NotificationJobKind.INSTANT,
      scheduledFor: now,
      sourceEntityType: "loot",
      sourceEntityId: id,
      sourceEventId: `loot:${id}`,
      payloadSnapshot: {},
    };

    let unavailable = true;
    const queued = new Set<string>();

    const scheduler = makeNotificationJobScheduler(database, {
      remove: () => Effect.void,
      add: (jobId) =>
        unavailable
          ? Effect.fail(new Error("Queue unavailable"))
          : Effect.sync(() => {
              queued.add(jobId);
            }),
    });

    const delivery = () =>
      scheduler
        .create(input)
        .pipe(
          Effect.flatMap((job) =>
            job ? scheduler.enqueue(job.id, 0) : Effect.void,
          ),
        );

    expect((await runtime.runPromise(Effect.exit(delivery())))._tag).toBe(
      "Failure",
    );
    unavailable = false;
    await runtime.runPromise(delivery());
    await runtime.runPromise(delivery());

    const jobs = await runtime.runPromise(
      database
        .select()
        .from(notificationJobTable)
        .where(eq(notificationJobTable.ruleId, rule.id)),
    );

    expect(jobs).toHaveLength(1);
    expect(queued).toEqual(new Set(jobs.map((job) => job.id)));
    await runtime.runPromise(
      database
        .update(notificationJobTable)
        .set({ status: "CANCELED" })
        .where(eq(notificationJobTable.ruleId, rule.id)),
    );
    expect(await runtime.runPromise(scheduler.create(input))).toBeNull();
    expect(
      await runtime.runPromise(
        database
          .select()
          .from(notificationJobTable)
          .where(eq(notificationJobTable.ruleId, rule.id)),
      ),
    ).toHaveLength(1);
  });

  it.skipIf(process.env.LOOT_DETAIL_LOAD_SAMPLE !== "1")(
    "measures real detail and list query work for 200 clients across ten loot events",
    async () => {
      const { id, request } = await seed();
      const guild = await seededGuild(id);
      const lootIds: number[] = [];

      for (let event = 0; event < 10; event++) {
        const result = await runtime.runPromise(
          acceptance().accept({
            ...request,
            submission: {
              ...request.submission,
              loots: request.submission.loots.map((item) => ({
                ...item,
                hid: randomUUID(),
              })),
            },
          }),
        );

        lootIds.push(result.id);
        snapshotTestLootIds.push(result.id);
      }

      expect(new Set(lootIds).size).toBe(10);

      const realQuery = makeLootQueryOperations(
        makeLootQueryPersistence(database),
      );

      let detailReads = 0;
      let visibilityReads = 0;

      const operations = makeLootsOperations({
        persistence: makeLootPersistence(database),
        query: {
          ...realQuery,
          isLootVisible: (...args) =>
            Effect.suspend(() => {
              visibilityReads++;

              return realQuery.isLootVisible(...args);
            }),
          fetchLootById: (...args) =>
            Effect.suspend(() => {
              detailReads++;

              return realQuery.fetchLootById(...args);
            }),
        },
        stats: { invalidateCache: () => Effect.void },
        redis: {
          invalidateScopes: async () => {
            throw new Error("Unexpected cache invalidation");
          },
          getOrSetJsonEffect: () => Effect.die("Unexpected list cache access"),
        },
        logger: applicationLogger,
      });

      const policy = createAccessPolicy({ capabilities: [Permission.OWNER] });
      const clients = Array.from({ length: 200 }, (_, index) => index);

      const measurements: Array<{
        scenario: string;
        readOperations: number;
        cpuMs: number;
        elapsedMs: number;
      }> = [];

      const measure = async (scenario: string, run: () => Promise<number>) => {
        const cpu = process.cpuUsage();
        const started = performance.now();
        const readOperations = await run();
        const elapsedMs = performance.now() - started;
        const used = process.cpuUsage(cpu);
        measurements.push({
          scenario,
          readOperations,
          cpuMs: (used.user + used.system) / 1000,
          elapsedMs,
        });
      };

      await measure("baseline-detail", async () => {
        for (const lootId of lootIds) {
          const values = await runtime.runPromise(
            Effect.all(
              clients.map(() =>
                realQuery.fetchLootById(guild, [Permission.OWNER], [], lootId),
              ),
              { concurrency: "unbounded" },
            ),
          );

          expect(values.every((loot) => loot?.id === lootId)).toBe(true);
        }

        return clients.length * lootIds.length;
      });
      await measure("coalesced-legacy-detail", async () => {
        for (const lootId of lootIds) {
          const values = await runtime.runPromise(
            Effect.all(
              clients.map(() =>
                operations.fetchLootById(guild, policy, [], lootId),
              ),
              { concurrency: "unbounded" },
            ),
          );

          expect(values.every((loot) => loot?.id === lootId)).toBe(true);
        }

        return detailReads + visibilityReads;
      });
      await measure("batched-first-page-no-cache", async () => {
        const pages = await runtime.runPromise(
          Effect.all(
            clients.map(() =>
              realQuery.fetchLootsByGuildId(guild, [Permission.OWNER], [], {
                limit: 20,
              }),
            ),
            { concurrency: "unbounded" },
          ),
        );

        expect(
          pages.every((page) =>
            lootIds.every((lootId) => page.some((loot) => loot.id === lootId)),
          ),
        ).toBe(true);

        return clients.length;
      });
      expect(detailReads).toBe(lootIds.length);
      expect(visibilityReads).toBe((clients.length - 1) * lootIds.length);
      process.stdout.write(
        `${JSON.stringify({ clients: clients.length, events: lootIds.length, detailHydrations: detailReads, detailVisibilityReads: visibilityReads, measurements })}\n`,
      );
    },
    120_000,
  );

  it("makes a published loot unavailable after archival without deleting the accepted loot", async () => {
    const { id, request } = await seed();
    const result = await runtime.runPromise(acceptance().accept(request));
    const sent: PublishOptions[] = [];
    await runtime.runPromise(
      makeLootPublicationDispatcher(
        database,
        {
          publish: (message) =>
            Effect.sync(() => {
              sent.push(message);
            }),
        },
        () => Effect.void,
      )(),
    );

    expect(
      sent.some(
        (message) =>
          message.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE,
      ),
    ).toBe(true);
    expect(await lootRecord(id, result.id)).not.toBeNull();
    expect(await pending(result.id)).toEqual([]);

    const guild = await seededGuild(id);
    const query = makeLootQueryOperations(makeLootQueryPersistence(database));
    const hydrated = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const operations = makeLootsOperations({
      query: {
        ...query,
        fetchLootById: (...args) =>
          query.fetchLootById(...args).pipe(
            Effect.tap(() =>
              Effect.promise(async () => {
                hydrated.resolve();
                await finish.promise;
              }),
            ),
          ),
      },
      persistence: makeLootPersistence(database),
      stats: { invalidateCache: () => Effect.void },
      redis: {
        invalidateScopes: async () => undefined,
        getOrSetJsonEffect: () => Effect.die("Unexpected list read"),
      },
      logger: applicationLogger,
    });

    const policy = createAccessPolicy({ capabilities: [Permission.OWNER] });

    const beforeArchive = runtime.runPromise(
      operations.fetchLootById(guild, policy, [], result.id),
    );

    await hydrated.promise;

    // Bypass this API instance, as an archive committed by another replica does.
    await runtime.runPromise(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(organizationLootRecordTable.guildId, id),
            eq(organizationLootRecordTable.lootId, result.id),
          ),
        ),
    );

    const afterArchive = runtime.runPromise(
      operations.fetchLootById(guild, policy, [], result.id),
    );

    finish.resolve();
    expect((await beforeArchive)?.id).toBe(result.id);
    expect(await afterArchive).toBeNull();

    // A delayed event or redelivery cannot make the archived detail readable.
    expect(await lootRecord(id, result.id)).toBeNull();
    expect(await lootList(id)).toEqual([]);
    expect(
      await runtime.runPromise(
        database
          .select({ id: lootTable.id })
          .from(lootTable)
          .where(eq(lootTable.id, result.id)),
      ),
    ).toEqual([{ id: result.id }]);
  });

  it("does not deliver pending metadata after the Organization record becomes archived", async () => {
    const { request } = await seed();
    const result = await runtime.runPromise(acceptance().accept(request));
    await runtime.runPromise(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: new Date() })
        .where(eq(organizationLootRecordTable.lootId, result.id)),
    );
    const sent: PublishOptions[] = [];
    await runtime.runPromise(
      makeLootPublicationDispatcher(
        database,
        {
          publish: (message) =>
            Effect.sync(() => {
              sent.push(message);
            }),
        },
        () => Effect.void,
      )(),
    );
    expect(sent).toEqual([]);
    expect(await pending(result.id)).toEqual([]);
  });
});
