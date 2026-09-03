import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { RedisService } from "#src/redis/redis.service";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import { makeEventDeletion } from "./event-deletion.js";

describe("event deletion Effect module", () => {
  it("does not inspect queues or cache when the scoped event is absent", async () => {
    const pending = mock(() => Promise.resolve([]));
    const delayed = mock(() => Promise.resolve([]));
    const select = () => ({
      from: () => ({
        where: () => ({
          limit: () => Effect.succeed([]),
        }),
      }),
    });
    const removeEvent = makeEventDeletion(
      { select } as unknown as typeof ApiDatabase.Service,
      {} as RedisService,
      { pending, delayed },
      {} as ApplicationLogger,
    );

    await expect(
      Effect.runPromise(removeEvent({ id: "guild-1" }, "event-1")),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(pending).not.toHaveBeenCalled();
    expect(delayed).not.toHaveBeenCalled();
  });
});
