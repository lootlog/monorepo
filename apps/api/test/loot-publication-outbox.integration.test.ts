import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
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
import type { CreateLootRequest } from "#src/contracts/loots/schemas";

describe("durable loot publications", () => {
  let runtime = ManagedRuntime.make(ApiDatabaseLive);
  let database: typeof ApiDatabase.Service;
  beforeAll(async () => {
    database = await runtime.runPromise(ApiDatabase);
  });
  afterAll(async () => {
    await runtime.dispose();
  });

  const seed = async () => {
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
          npcType: "HERO",
          allowedRarities: ["HEROIC"],
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
          stat: "rarity=heroic;lvl=80",
        },
      ],
      npcs: [
        {
          id: 8234568,
          name: "Test hero",
          location: "Test map",
          lvl: 80,
          prof: "w",
          wt: 85,
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
