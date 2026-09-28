import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { NotificationTargetType } from "@lootlog/schema/notifications";

import { InvalidRequestError } from "#src/shared/http/http-errors";
import {
  makeNotificationGuildTargets,
  type NotificationPendingJobs,
} from "#src/notifications/targets/notification-guild-targets";
import { makeNotificationUserTargets } from "#src/notifications/targets/notification-user-targets";
import {
  guildTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { createGuildFixture } from "../../../test/organization-fixtures.js";
import {
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";

describe("notification guild targets Effect module", () => {
  it("rejects a DM target before channel, database, or job access", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const selectable = mock(() => Effect.die("unexpected channel read"));
      const cancel = mock(() => Effect.die("unexpected job cancellation"));

      const targets = makeNotificationGuildTargets(
        boundary.database,
        { selectable },
        { cancel },
      );

      await expect(
        boundary.run(
          targets.create("guild-1", {
            targetType: NotificationTargetType.DM,
          }),
        ),
      ).rejects.toBeInstanceOf(InvalidRequestError);
      expect(selectable).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
    } finally {
      await boundary.dispose();
    }
  });
});

describe.each(["USER", "GUILD"] as const)("%s target removal", (ownerType) => {
  it("deletes only rules losing their last target and preserves another organization", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database } = boundary;
      const ownerId = "owner-1";
      const targetType = ownerType === "USER" ? "DM" : "CHANNEL";
      const guildId = ownerType === "GUILD" ? ownerId : null;

      await boundary.run(
        database
          .insert(guildTable)
          .values([
            createGuildFixture({ id: ownerId }),
            createGuildFixture({ id: "other-guild" }),
          ]),
      );
      await boundary.run(
        database.insert(notificationTargetTable).values([
          createNotificationTargetFixture({
            id: 9,
            ownerType,
            ownerId,
            targetType,
            externalId: ownerId,
          }),
          createNotificationTargetFixture({
            id: 10,
            ownerType,
            ownerId,
            targetType,
            externalId: "second-target",
          }),
          createNotificationTargetFixture({
            id: 11,
            ownerType: "GUILD",
            ownerId: "other-guild",
            targetType: "CHANNEL",
            externalId: "other-channel",
          }),
        ]),
      );
      await boundary.run(
        database.insert(notificationRuleTable).values([
          createNotificationRuleFixture({ id: 7, ownerType, ownerId, guildId }),
          createNotificationRuleFixture({ id: 8, ownerType, ownerId, guildId }),
          createNotificationRuleFixture({
            id: 9,
            ownerType: "GUILD",
            ownerId: "other-guild",
            guildId: "other-guild",
          }),
        ]),
      );
      await boundary.run(
        database.insert(notificationRuleTargetTable).values([
          { ruleId: 7, targetId: 9 },
          { ruleId: 8, targetId: 9 },
          { ruleId: 8, targetId: 10 },
          { ruleId: 9, targetId: 11 },
        ]),
      );

      const cancel = mock<NotificationPendingJobs["cancel"]>(() => Effect.void);

      const targets =
        ownerType === "USER"
          ? makeNotificationUserTargets(database, {
              cancel,
              create: () => Effect.die("unexpected job creation"),
              enqueue: () => Effect.die("unexpected job enqueue"),
            })
          : makeNotificationGuildTargets(
              database,
              {
                selectable: () => Effect.die("unexpected channel read"),
              },
              { cancel },
            );

      await boundary.run(targets.remove(ownerId, 9));

      expect(
        await boundary.run(
          database
            .select({ id: notificationTargetTable.id })
            .from(notificationTargetTable)
            .orderBy(notificationTargetTable.id),
        ),
      ).toEqual([{ id: 10 }, { id: 11 }]);
      expect(
        await boundary.run(
          database
            .select({ id: notificationRuleTable.id })
            .from(notificationRuleTable)
            .orderBy(notificationRuleTable.id),
        ),
      ).toEqual([{ id: 8 }, { id: 9 }]);
      expect(
        await boundary.run(
          database
            .select({
              ruleId: notificationRuleTargetTable.ruleId,
              targetId: notificationRuleTargetTable.targetId,
            })
            .from(notificationRuleTargetTable)
            .orderBy(notificationRuleTargetTable.ruleId),
        ),
      ).toEqual([
        { ruleId: 8, targetId: 10 },
        { ruleId: 9, targetId: 11 },
      ]);
      expect(cancel.mock.calls).toEqual([[{ targetId: 9 }], [{ ruleId: 7 }]]);
    } finally {
      await boundary.dispose();
    }
  });
});
