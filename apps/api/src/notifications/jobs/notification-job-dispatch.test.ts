import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  lootTable,
  lootNpcTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job-store";
import { canDispatchLootNotification } from "#src/notifications/notification-loot-source-visibility";
import {
  makeNotificationJobDispatch,
  type NotificationDispatchJob,
  type NotificationDispatchStore,
} from "#src/notifications/jobs/notification-job-dispatch";
import { NotificationJobStatus } from "#src/notifications/notification-enums";

const job = (active: boolean): NotificationDispatchJob => ({
  ...createNotificationJobFixture({
    attemptCount: 2,
    status: "PENDING",
    payloadSnapshot: { title: "title", message: "message" },
    targetId: 4,
  }),
  rule: createNotificationRuleFixture(),
  target: createNotificationTargetFixture({ id: 4, active }),
});

describe("notification job dispatch", () => {
  it("rechecks persisted loot revisions before retries and preserves terminal jobs on replay", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = new Date();
      await run(
        database
          .insert(guildTable)
          .values(createGuildFixture({ id: "organization" })),
      );
      await run(
        database.insert(memberTable).values(
          createMemberFixture({
            id: 1,
            guildId: "organization",
            userId: "recipient",
            globalUserId: "user",
          }),
        ),
      );
      await run(
        database.insert(roleTable).values({
          id: "reader",
          guildId: "organization",
          name: "Reader",
          updatedAt: now,
          lvlRangeFrom: 0,
          lvlRangeTo: 190,
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_LOOTS_READ,
          ],
        }),
      );
      await run(
        database.insert(memberToRoleTable).values({ A: 1, B: "reader" }),
      );
      await run(
        database.insert(npcSnapshotTable).values([
          {
            id: 1,
            npcId: 52950,
            name: "Czempion Furboli",
            type: "ELITE2",
            lvl: 183,
            snapshotHash: "before",
          },
          {
            id: 2,
            npcId: 52950,
            name: "Czempion Furboli",
            type: "ELITE2",
            lvl: 210,
            snapshotHash: "after",
          },
        ]),
      );
      await run(
        database.insert(notificationRuleTable).values(
          createNotificationRuleFixture({
            ownerId: "recipient",
            triggerType: "WATCHED_ITEM_DROPPED",
            filters: { guildIds: ["organization"] },
          }),
        ),
      );
      await run(
        database
          .insert(notificationTargetTable)
          .values(createNotificationTargetFixture({ ownerId: "recipient" })),
      );

      for (const id of [1, 2]) {
        await run(
          database.insert(lootTable).values({
            id,
            uniqueId: `loot-${id}`,
            world: "world",
            source: "FIGHT",
            location: "map",
            updatedAt: now,
          }),
        );
        await run(
          database
            .insert(lootNpcTable)
            .values({ lootId: id, npcSnapshotId: id }),
        );
        await run(
          database
            .insert(organizationLootRecordTable)
            .values({ lootId: id, guildId: "organization", updatedAt: now }),
        );
        await run(
          database.insert(notificationJobTable).values(
            createNotificationJobFixture({
              id: `job-${id}`,
              idempotencyKey: `job-${id}`,
              ownerId: "recipient",
              status: "PENDING",
              sourceEntityType: "loot",
              sourceEntityId: String(id),
              attemptCount: 0,
              payloadSnapshot: {
                guildIds: ["organization"],
                message: `Loot ${id}`,
              },
            }),
          ),
        );
      }

      const store = makeNotificationJobStore(database);
      const attempts: string[] = [];
      let brokerUnavailable = false;

      const dispatchStore = {
        find: store.findJobWithRelations,
        update: store.updateJob,
        claim: store.claimJob,
        block: store.blockJob,
      };

      const dispatch = makeNotificationJobDispatch(
        dispatchStore,
        {
          hasRequiredGuildPermissions: () => Effect.succeed(true),
          canReadLootSource: (jobId, discordId) =>
            canDispatchLootNotification(database, jobId, discordId),
        },
        {
          publish: (command) =>
            Effect.gen(function* () {
              attempts.push(command.notificationJobId);

              if (brokerUnavailable)
                return yield* Effect.fail(new Error("broker unavailable"));
            }),
        },
        { enqueue: () => Effect.void },
        () => undefined,
      );

      await run(dispatch("job-1"));
      await run(dispatch("job-2"));
      expect(attempts).toEqual(["job-1"]);
      expect(await run(store.findJob("job-2"))).toMatchObject({
        status: "BLOCKED",
        attemptCount: 0,
      });

      await run(
        database
          .update(roleTable)
          .set({ lvlRangeTo: 250 })
          .where(eq(roleTable.id, "reader")),
      );
      brokerUnavailable = true;
      await run(dispatch("job-2"));
      expect(await run(store.findJob("job-2"))).toMatchObject({
        status: "PENDING",
        attemptCount: 1,
      });
      await run(
        database
          .update(roleTable)
          .set({ lvlRangeTo: 190 })
          .where(eq(roleTable.id, "reader")),
      );
      brokerUnavailable = false;
      await run(dispatch("job-2"));
      expect(attempts).toEqual(["job-1", "job-2"]);
      expect(await run(store.findJob("job-2"))).toMatchObject({
        status: "BLOCKED",
        attemptCount: 1,
      });

      await run(
        database
          .update(roleTable)
          .set({ lvlRangeTo: 250 })
          .where(eq(roleTable.id, "reader")),
      );

      for (const sourceEntityId of [
        "invalid-loot",
        "0002",
        "999999999999999999999999",
      ]) {
        await run(
          store.updateJob("job-2", { status: "PENDING", sourceEntityId }),
        );
        await run(dispatch("job-2"));
        expect(await run(store.findJob("job-2"))).toMatchObject({
          status: "BLOCKED",
          attemptCount: 1,
        });
      }

      await run(store.updateJob("job-1", { status: "SENT" }));
      await run(store.updateJob("job-2", { status: "CANCELED" }));
      await run(
        database
          .update(memberTable)
          .set({ active: false })
          .where(eq(memberTable.id, 1)),
      );
      await run(dispatch("job-1"));
      await run(dispatch("job-2"));
      expect(await run(store.findJob("job-1"))).toMatchObject({
        status: "SENT",
      });
      expect(await run(store.findJob("job-2"))).toMatchObject({
        status: "CANCELED",
      });
      expect(attempts).toEqual(["job-1", "job-2"]);

      for (const status of ["SENT", "CANCELED", "PROCESSING"] as const) {
        await run(
          store.updateJob("job-2", { status: "PENDING", sourceEntityId: "2" }),
        );
        const started = Promise.withResolvers<void>();
        const resume = Promise.withResolvers<void>();

        const delayedDispatch = makeNotificationJobDispatch(
          dispatchStore,
          {
            hasRequiredGuildPermissions: () => Effect.succeed(true),
            canReadLootSource: (jobId, discordId) =>
              Effect.gen(function* () {
                started.resolve();
                yield* Effect.promise(() => resume.promise);

                return yield* canDispatchLootNotification(
                  database,
                  jobId,
                  discordId,
                );
              }),
          },
          { publish: () => Effect.die("Revoked source must not publish") },
          { enqueue: () => Effect.void },
          () => undefined,
        );

        const dispatching = run(delayedDispatch("job-2"));

        try {
          await started.promise;
          await run(store.updateJob("job-2", { status }));
        } finally {
          resume.resolve();
        }

        await dispatching;
        expect(await run(store.findJob("job-2"))).toMatchObject({ status });
      }
    } finally {
      await boundary.dispose();
    }
  });

  it("blocks an inactive target before claim and publish", async () => {
    const updates: Array<Parameters<NotificationDispatchStore["update"]>[1]> =
      [];

    let claimed = false;
    let published = false;

    const dispatch = makeNotificationJobDispatch(
      {
        find: () => Effect.succeed(job(false)),
        update: (_jobId, values) =>
          Effect.sync(() => {
            updates.push(values);
          }),
        block: (_jobId, reason) =>
          Effect.sync(() => {
            updates.push({
              status: "BLOCKED",
              blockedReason: reason,
              lastError: reason,
            });
          }),
        claim: () =>
          Effect.sync(() => {
            claimed = true;

            return true;
          }),
      },
      {
        hasRequiredGuildPermissions: () => Effect.succeed(true),
        canReadLootSource: () => Effect.succeed(true),
      },
      {
        publish: () =>
          Effect.sync(() => {
            published = true;
          }),
      },
      { enqueue: () => Effect.void },
      () => undefined,
    );

    await Effect.runPromise(dispatch("job-1"));

    expect(updates).toEqual([
      {
        status: NotificationJobStatus.BLOCKED,
        blockedReason: "Notification target is disabled",
        lastError: "Notification target is disabled",
      },
    ]);
    expect(claimed).toBeFalse();
    expect(published).toBeFalse();
  });

  it("returns a claimed job to pending and enqueues the established retry", async () => {
    const updates: Array<Parameters<NotificationDispatchStore["update"]>[1]> =
      [];

    const enqueued: Array<[string, number]> = [];

    const dispatch = makeNotificationJobDispatch(
      {
        find: () => Effect.succeed(job(true)),
        update: (_jobId, values) =>
          Effect.sync(() => {
            updates.push(values);
          }),
        claim: () => Effect.succeed(true),
        block: () => Effect.die("Unexpected blocked job"),
      },
      {
        hasRequiredGuildPermissions: () => Effect.succeed(true),
        canReadLootSource: () => Effect.succeed(true),
      },
      { publish: () => Effect.fail(new Error("broker unavailable")) },
      {
        enqueue: (jobId, delay) =>
          Effect.sync(() => {
            enqueued.push([jobId, delay]);
          }),
      },
      () => undefined,
    );

    await Effect.runPromise(dispatch("job-1"));

    expect(updates).toEqual([
      {
        status: NotificationJobStatus.PENDING,
        lastError: "AMQP publish failed: broker unavailable",
      },
    ]);
    expect(enqueued).toEqual([["job-1", 30_000]]);
  });
});
