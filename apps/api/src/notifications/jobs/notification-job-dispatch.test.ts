import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { Capability } from "@lootlog/schema/permissions";
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
} from "#src/database/drizzle/organization.schema";
import {
  lootTable,
  lootNpcTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/notification.schema";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job.repository";
import { canDispatchLootNotification } from "#src/notifications/notification-loot-source-visibility";
import {
  makeNotificationJobDispatch,
  NotificationJobDispatchFailure,
  type NotificationDispatchJob,
  type NotificationDispatchStore,
} from "#src/notifications/jobs/notification-job-dispatch";
import { NotificationJobStatus } from "@lootlog/schema/notifications";
import { createOrganizationLootRecordFixture } from "../../../test/loot-fixtures.js";

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
            Capability.LOOTLOG_ACCESS,
            Capability.LOOTLOG_LOOTS_READ,
          ],
        }),
      );
      await run(
        database.insert(memberToRoleTable).values({ A: 1, B: "reader" }),
      );
      await run(
        database.insert(npcSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            npcId: 52950,
            name: "Czempion Furboli",
            type: "ELITE2",
            lvl: 183,
            snapshotHash: "before",
          },
          {
            gameVersion: "pl",
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
            gameVersion: "pl",
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
          database.insert(organizationLootRecordTable).values(
            createOrganizationLootRecordFixture({
              lootId: id,
              guildId: "organization",
              updatedAt: now,
            }),
          ),
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
        failClaim: store.failClaim,
        block: store.blockJob,
        cancel: store.cancelJob,
      };

      const firstAttempt = { retrying: false };
      const retry = { retrying: true };

      const dispatch = makeNotificationJobDispatch(
        dispatchStore,
        {
          hasRequiredGuildPermissions: () => Effect.succeed(true),
          isOrganizationOperational: () => Effect.succeed(true),
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
        () => Effect.void,
        () => undefined,
        { filesFor: () => Effect.succeed([]) },
      );

      await run(dispatch("job-1", firstAttempt));
      await run(dispatch("job-2", firstAttempt));
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
      await expect(run(dispatch("job-2", firstAttempt))).rejects.toBeInstanceOf(
        NotificationJobDispatchFailure,
      );
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
      await run(dispatch("job-2", retry));
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
        await run(dispatch("job-2", firstAttempt));
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
      await run(dispatch("job-1", retry));
      await run(dispatch("job-2", retry));
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
            isOrganizationOperational: () => Effect.succeed(true),
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
          () => Effect.void,
          () => undefined,
          { filesFor: () => Effect.succeed([]) },
        );

        const dispatching = run(delayedDispatch("job-2", firstAttempt));

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
        cancel: () => Effect.succeed(false),
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
        failClaim: () => Effect.die("blocked jobs cannot fail a claim"),
      },
      {
        hasRequiredGuildPermissions: () => Effect.succeed(true),
        isOrganizationOperational: () => Effect.succeed(true),
        canReadLootSource: () => Effect.succeed(true),
      },
      {
        publish: () =>
          Effect.sync(() => {
            published = true;
          }),
      },
      () => Effect.void,
      () => undefined,
      { filesFor: () => Effect.succeed([]) },
    );

    await Effect.runPromise(dispatch("job-1", { retrying: false }));

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

  it("skips an Organization job while the Organization is suspended and lets its schedule move on", async () => {
    const canceled: string[] = [];
    const finalized: number[] = [];
    let published = false;

    const dispatch = makeNotificationJobDispatch(
      {
        find: () =>
          Effect.succeed({
            ...job(true),
            ownerType: "GUILD",
            ownerId: "guild-1",
          }),
        update: () => Effect.void,
        cancel: (_jobId, reason) =>
          Effect.sync(() => {
            canceled.push(reason);

            return true;
          }),
        block: () => Effect.die("a suspended Organization job is not blocked"),
        claim: () => Effect.die("a suspended Organization job is not claimed"),
        failClaim: () => Effect.die("skipped jobs cannot fail a claim"),
      },
      {
        hasRequiredGuildPermissions: () => Effect.succeed(true),
        isOrganizationOperational: (guildId) =>
          Effect.succeed(guildId !== "guild-1"),
        canReadLootSource: () => Effect.succeed(true),
      },
      {
        publish: () =>
          Effect.sync(() => {
            published = true;
          }),
      },
      (skipped) =>
        Effect.sync(() => {
          finalized.push(skipped.ruleId);
        }),
      () => undefined,
      { filesFor: () => Effect.succeed([]) },
    );

    await Effect.runPromise(dispatch("job-1", { retrying: false }));

    expect(canceled).toEqual(["Organization is inactive or suspended"]);
    expect(finalized).toEqual([job(true).ruleId]);
    expect(published).toBeFalse();
  });

  it("keeps a delivered job final when a queued retry finds its target disabled", async () => {
    const dispatch = makeNotificationJobDispatch(
      {
        find: () => Effect.succeed({ ...job(false), status: "SENT" }),
        update: () => Effect.die("delivery must remain final"),
        claim: () => Effect.die("delivered jobs cannot be claimed again"),
        failClaim: () => Effect.die("delivered jobs cannot fail"),
        cancel: () => Effect.die("delivered jobs cannot be canceled"),
        block: () => Effect.die("delivered jobs cannot be blocked"),
      },
      {
        hasRequiredGuildPermissions: () => Effect.succeed(true),
        isOrganizationOperational: () => Effect.succeed(true),
        canReadLootSource: () => Effect.die("delivered jobs are not rechecked"),
      },
      {
        publish: () => Effect.die("delivered jobs must not be published again"),
      },
      () => Effect.void,
      () => undefined,
      { filesFor: () => Effect.succeed([]) },
    );

    await Effect.runPromise(dispatch("job-1", { retrying: true }));
  });
});
