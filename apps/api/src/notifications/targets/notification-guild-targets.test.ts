import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { NotificationTargetType } from "@lootlog/schema/notifications";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { makeNotificationGuildTargets } from "#src/notifications/targets/notification-guild-targets";

describe("notification guild targets Effect module", () => {
  it("rejects a DM target before channel, database, or job access", async () => {
    const selectable = mock(() => Effect.die("unexpected channel read"));
    const cancel = mock(() => Effect.die("unexpected job cancellation"));
    const database = {
      insert: () => {
        throw new Error("unexpected database write");
      },
    } as unknown as ApiDatabaseValue;
    const targets = makeNotificationGuildTargets(
      database,
      { selectable },
      { cancel },
    );

    await expect(
      Effect.runPromise(
        targets.create("guild-1", {
          targetType: NotificationTargetType.DM,
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidRequestError);
    expect(selectable).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});
