import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { makeNotificationJobOperations } from "#src/notifications/jobs/notification-job-operations";

describe("notification job operations Effect module", () => {
  it("does not cancel a completed guild job", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const database = boundary.database;
      await boundary.run(
        database
          .insert(notificationRuleTable)
          .values(createNotificationRuleFixture()),
      );
      await boundary.run(
        database
          .insert(notificationTargetTable)
          .values(createNotificationTargetFixture()),
      );
      await boundary.run(
        database.insert(notificationJobTable).values(
          createNotificationJobFixture({
            status: "SENT",
            ownerType: "GUILD",
            ownerId: "guild-1",
          }),
        ),
      );
      const cancel = mock(() => Effect.die("unexpected cancellation"));
      const operations = makeNotificationJobOperations(database, { cancel });
      await expect(
        boundary.run(operations.cancelGuild("guild-1", "job-1")),
      ).rejects.toBeInstanceOf(InvalidRequestError);
      expect(cancel).not.toHaveBeenCalled();
      expect(
        await boundary.run(
          database
            .select({ status: notificationJobTable.status })
            .from(notificationJobTable),
        ),
      ).toEqual([{ status: "SENT" }]);
    } finally {
      await boundary.dispose();
    }
  });
});
