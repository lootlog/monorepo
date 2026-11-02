import { expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  userPinnedReservationSpotTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import { makeUserAccountDeletion } from "./user-account-deletion.data-layer.js";

it("removes the deleted User's personal notifications and pins but keeps other owners' rows", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const updatedAt = new Date(0);
    await boundary.run(
      database.insert(guildTable).values(createGuildFixture()),
    );

    const owners = [
      { userId: "user-1", discordId: "discord-1" },
      { userId: "user-2", discordId: "discord-2" },
    ];

    for (const [index, owner] of owners.entries()) {
      const [rule] = await boundary.run(
        database
          .insert(notificationRuleTable)
          .values({
            ownerType: "USER",
            ownerId: owner.discordId,
            triggerType: "WATCHED_ITEM_DROPPED",
            updatedAt,
          })
          .returning({ id: notificationRuleTable.id }),
      );

      const [target] = await boundary.run(
        database
          .insert(notificationTargetTable)
          .values({
            ownerType: "USER",
            ownerId: owner.discordId,
            provider: "DISCORD",
            targetType: "DM",
            externalId: owner.discordId,
            updatedAt,
          })
          .returning({ id: notificationTargetTable.id }),
      );

      if (!rule || !target) throw new Error("Missing notification fixture");

      await boundary.run(
        database
          .insert(notificationRuleTargetTable)
          .values({ ruleId: rule.id, targetId: target.id }),
      );
      await boundary.run(
        database.insert(notificationJobTable).values({
          id: `job-${index}`,
          ruleId: rule.id,
          targetId: target.id,
          ownerType: "USER",
          ownerId: owner.discordId,
          jobKind: "INSTANT",
          scheduledFor: new Date(Date.UTC(2030, 0, 1)),
          idempotencyKey: `job-${index}`,
          payloadSnapshot: {},
          updatedAt,
        }),
      );
      await boundary.run(
        database.insert(watchedItemTable).values({
          userId: owner.discordId,
          itemId: 1,
          itemName: "Item",
          world: "tempest",
          notificationRuleId: rule.id,
          updatedAt,
        }),
      );
      await boundary.run(
        database.insert(userPinnedReservationSpotTable).values({
          userId: owner.userId,
          guildId: "guild-1",
          spotId: "spot",
        }),
      );
    }

    await boundary.run(
      makeUserAccountDeletion(database, {
        cleanupBattlelog: () => Effect.void,
        deleteCacheKey: () => Effect.void,
        invalidateCacheScopes: () => Effect.void,
        deleteCachePattern: () => Effect.void,
        publishMemberRemoved: () => Effect.void,
      })(owners[0]!),
    );

    const remaining = async () => ({
      rules: (
        await boundary.run(database.select().from(notificationRuleTable))
      ).map(({ ownerId }) => ownerId),
      targets: (
        await boundary.run(database.select().from(notificationTargetTable))
      ).map(({ ownerId }) => ownerId),
      jobs: (
        await boundary.run(database.select().from(notificationJobTable))
      ).map(({ ownerId }) => ownerId),
      watchedItems: (
        await boundary.run(database.select().from(watchedItemTable))
      ).map(({ userId }) => userId),
      pinnedSpots: (
        await boundary.run(
          database.select().from(userPinnedReservationSpotTable),
        )
      ).map(({ userId }) => userId),
    });

    expect(await remaining()).toEqual({
      rules: ["discord-2"],
      targets: ["discord-2"],
      jobs: ["discord-2"],
      watchedItems: ["discord-2"],
      pinnedSpots: ["user-2"],
    });
  } finally {
    await boundary.dispose();
  }
});
