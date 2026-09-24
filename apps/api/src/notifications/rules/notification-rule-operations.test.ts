import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { createNotificationRuleFixture } from "../../../test/notification-fixtures.js";
import { UpdateNotificationRuleRequest } from "#src/contracts/notifications/schemas";
import { notificationRuleTable } from "#src/database/drizzle/schema";
import { makeNotificationRuleOperations } from "./notification-rule-operations.js";

test("preserves an omitted end date and persists an explicitly cleared end date", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    const endDate = new Date("2099-09-03T10:00:00.000Z");
    await boundary.run(
      database.insert(notificationRuleTable).values(
        createNotificationRuleFixture({
          scheduledUntil: endDate,
          scheduledAt: new Date(0),
        }),
      ),
    );

    const rules = makeNotificationRuleOperations(database, {
      ensureGuildPermissions: () => Effect.void,
      rebuildJobs: () => Effect.void,
      cancelJobs: () => Effect.void,
      buildTestPayload: () => Effect.succeed({}),
      createTestJob: () => Effect.succeed(null),
      enqueueJob: () => Effect.void,
    });

    const decode = Schema.decodeUnknownSync(UpdateNotificationRuleRequest);

    await boundary.run(
      rules.updateUser("user-1", 7, decode({ name: "Edited message" })),
    );
    expect(
      (await boundary.run(rules.listUser("user-1")))[0]?.scheduledUntil,
    ).toEqual(endDate);

    const beforeUpdate = Date.now();
    await boundary.run(
      rules.updateUser("user-1", 7, decode({ scheduledUntil: null })),
    );

    const [stored] = await boundary.run(
      database
        .select()
        .from(notificationRuleTable)
        .where(eq(notificationRuleTable.id, 7)),
    );

    expect(stored?.scheduledUntil).toBeNull();
    expect(stored?.scheduledAt?.getTime()).toBeGreaterThan(beforeUpdate);
    expect(
      (await boundary.run(rules.listUser("user-1")))[0]?.scheduledUntil,
    ).toBeNull();
  } finally {
    await boundary.dispose();
  }
});
