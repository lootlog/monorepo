import { describe, expect, it, mock } from "bun:test";
import { NotificationTargetType } from "@lootlog/schema/notifications";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { BadRequestException } from "#src/shared/http/http-errors";
import { makeNotificationUserTargets } from "./notification-user-targets.js";

describe("notification user targets Effect module", () => {
  it("rejects a channel target before database or job access", async () => {
    const cancel = mock(() => Effect.die("unexpected job cancellation"));
    const createJob = mock(() => Effect.die("unexpected job creation"));
    const enqueue = mock(() => Effect.die("unexpected job enqueue"));
    const database = {
      insert: () => {
        throw new Error("unexpected database write");
      },
    } as unknown as ApiDatabaseValue;
    const targets = makeNotificationUserTargets(database, {
      cancel,
      create: createJob,
      enqueue,
    });

    await expect(
      Effect.runPromise(
        targets.create("discord-1", {
          targetType: NotificationTargetType.CHANNEL,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cancel).not.toHaveBeenCalled();
    expect(createJob).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
