import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { describe, expect, it, mock } from "bun:test";
import { NotificationTargetType } from "@lootlog/schema/notifications";
import { Effect } from "effect";

import { InvalidRequestError } from "#src/shared/http/http-errors";
import { makeNotificationUserTargets } from "#src/notifications/targets/notification-user-targets";

describe("notification user targets Effect module", () => {
  it("rejects a channel target before database or job access", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const cancel = mock(() => Effect.die("unexpected job cancellation"));
      const createJob = mock(() => Effect.die("unexpected job creation"));
      const enqueue = mock(() => Effect.die("unexpected job enqueue"));
      const targets = makeNotificationUserTargets(boundary.database, {
        cancel,
        create: createJob,
        enqueue,
      });

      await expect(
        boundary.run(
          targets.create("discord-1", {
            targetType: NotificationTargetType.CHANNEL,
          }),
        ),
      ).rejects.toBeInstanceOf(InvalidRequestError);
      expect(cancel).not.toHaveBeenCalled();
      expect(createJob).not.toHaveBeenCalled();
      expect(enqueue).not.toHaveBeenCalled();
    } finally {
      await boundary.dispose();
    }
  });
});
