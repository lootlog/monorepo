import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { BadRequestException } from "#src/shared/http/http-errors";
import { makeNotificationJobOperations } from "./notification-job-operations.js";

describe("notification job operations Effect module", () => {
  it("does not cancel a completed guild job", async () => {
    const cancel = mock(() => Effect.die("unexpected cancellation"));
    const select = () => ({
      from: () => ({
        where: () => ({ limit: () => Effect.succeed([{ status: "SENT" }]) }),
      }),
    });
    const operations = makeNotificationJobOperations(
      { select } as unknown as ApiDatabaseValue,
      { cancel },
    );

    await expect(
      Effect.runPromise(operations.cancelGuild("guild-1", "job-1")),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cancel).not.toHaveBeenCalled();
  });
});
