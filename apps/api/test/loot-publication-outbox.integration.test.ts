import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { Capability } from "@lootlog/schema/permissions";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { and, arrayOverlaps, count, eq, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { MessagingError, type PublishOptions } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";
import {
  lootTable,
  organizationLootRecordTable,
  lootSubmissionTable,
} from "#src/database/drizzle/loot.schema";
import {
  notificationTargetTable,
  notificationRuleTable,
  notificationJobTable,
} from "#src/database/drizzle/notification.schema";
import {
  makeNotificationJobScheduler,
  type NotificationJobInput,
} from "#src/notifications/jobs/notification-job-scheduler";
import { NotificationJobKind } from "@lootlog/schema/notifications";
import {
  makeLootPublicationDispatcher,
  makeLootSnapshotReader,
} from "#src/loots/submission/loot-publication-outbox";
import { GuildLootCreatedMessageV2 } from "@lootlog/protocol/loot-events";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot.repository";
import {
  makeLootAcceptanceFixture,
  type ApiDatabaseRuntime,
} from "./loot-acceptance-fixtures.js";

const fixture = makeLootAcceptanceFixture();

const {
  seed,
  acceptance,
  pending,
  snapshotTestLootIds,
  seededGuild,
  lootRecord,
  lootList,
} = fixture;

let runtime: ApiDatabaseRuntime;

let database: typeof ApiDatabase.Service;

describe("durable loot publications", () => {
  beforeAll(async () => {
    ({ runtime, database } = await fixture.connect());
  });

  afterEach(fixture.releaseSnapshotTestOutbox);

  afterAll(() => fixture.close());

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
      () => Effect.succeed(null),
    );

    await runtime.runPromise(dispatch());
    expect(invalidated).toEqual([]);
    expect(await pending(result.id)).toHaveLength(2);
    expect(await runtime.runPromise(acceptance().accept(request))).toEqual(
      result,
    );
    expect(await pending(result.id)).toHaveLength(2);

    ({ runtime, database } = await fixture.restart());

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
      () => Effect.fail(new Error("Snapshot read unavailable")),
    );

    await runtime.runPromise(
      Effect.all([recovered(), recovered()], { concurrency: 2 }),
    );
    await runtime.runPromise(acceptance().accept(request));
    await runtime.runPromise(recovered());
    expect(await pending(result.id)).toHaveLength(0);
    expect(invalidated).toEqual([[id]]);

    const created = sent.find(
      (message) => message.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE,
    );

    const createdPayload =
      created && JSON.parse(new TextDecoder().decode(created.content));

    expect(createdPayload).toMatchObject({ guildId: id, lootId: result.id });
    expect(createdPayload).not.toHaveProperty("loot");
    expect(sent.map((message) => message.routingKey).sort()).toEqual(
      [
        RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        RabbitRoutingKey.SEARCH_PLAYERS_INDEX,
        RabbitRoutingKey.CATALOG_NPCS_INDEX,
        RabbitRoutingKey.CATALOG_ITEMS_INDEX,
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
    const published = new Map<string, unknown>();
    await runtime.runPromise(
      makeLootPublicationDispatcher(
        database,
        {
          publish: (message) =>
            Effect.sync(() => {
              if (message.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE) {
                const payload = Schema.decodeUnknownSync(
                  GuildLootCreatedMessageV2,
                )(JSON.parse(new TextDecoder().decode(message.content)));

                published.set(payload.guildId, payload.loot);
              }
            }),
        },
        () => Effect.void,
        makeLootSnapshotReader(
          makeLootQueryOperations(makeLootQueryPersistence(database)),
        ),
      )(),
    );
    expect([...published.keys()].sort()).toEqual([first.id, second.id].sort());

    for (const organizationId of [first.id, second.id]) {
      expect(published.get(organizationId)).toMatchObject({
        id: accepted.id,
        submissions: [{ guildId: organizationId, lootId: accepted.id }],
      });
    }

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
        () => Effect.succeed(null),
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
      signalDrawAnnouncements: Effect.void,
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
      redis: {
        invalidateScopes: () => Effect.void,
        getOrSetJson: () => Effect.die("Unexpected list read"),
      },
    });

    const policy = createAccessPolicy({ capabilities: [Capability.OWNER] });

    const beforeArchive = runtime.runPromise(
      operations.fetchLootById(guild, policy, [], result.id),
    );

    await hydrated.promise;

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
        () => Effect.succeed(null),
      )(),
    );
    expect(sent).toEqual([]);
    expect(await pending(result.id)).toEqual([]);
  });
});
