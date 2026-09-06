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
import { and, count, eq, inArray, sql } from "drizzle-orm";
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
  lootPlayerTable,
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
import { makeLootPublicationDispatcher } from "#src/loots/submission/loot-publication-outbox";

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
  const acceptance = () =>
    makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        withLock: (_resource, _ttl, _options, effect) => effect,
      },
    );
  const pending = (lootId: number) =>
    runtime.runPromise(
      database
        .select()
        .from(lootPublicationOutboxTable)
        .where(eq(lootPublicationOutboxTable.lootId, lootId)),
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
    "accepts concurrent loots with opposite participants and the same map roster (round %j)",
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
      first.request.submission = {
        ...first.request.submission,
        world,
        npcs: first.request.submission.npcs.map((npc) => ({
          ...npc,
          id: randomInt(1, 1_000_000),
          name: randomUUID(),
        })),
        loots: first.request.submission.loots.map((item) => ({
          ...item,
          id: randomInt(1, 1_000_000),
          name: randomUUID(),
        })),
        players: [{ ...playerA, id: playerA.characterId, prof: "w", lvl: 80 }],
        mapPlayersSnapshot: [playerA, playerB],
      };
      second.request.submission = {
        ...second.request.submission,
        world,
        npcs: second.request.submission.npcs.map((npc) => ({
          ...npc,
          id: randomInt(1_000_001, 2_000_000),
          name: randomUUID(),
        })),
        loots: second.request.submission.loots.map((item) => ({
          ...item,
          id: randomInt(1_000_001, 2_000_000),
          name: randomUUID(),
        })),
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
        Effect.exit(acceptance().accept(request)),
      );
      expect(result._tag).toBe("Failure");
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
