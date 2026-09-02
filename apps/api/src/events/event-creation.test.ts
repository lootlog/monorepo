import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { RedisService } from "#src/redis/redis.service";
import { BadRequestException } from "#src/shared/http/http-errors";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import { makeEventCreation } from "./event-creation.js";

describe("event creation Effect module", () => {
  it("rejects an empty normalized world before database access", async () => {
    const database = new Proxy(
      {},
      { get: () => () => Effect.die("unexpected database call") },
    ) as typeof ApiDatabase.Service;
    const createEvent = makeEventCreation(
      database,
      {} as RedisService,
      {} as ApplicationLogger,
    );

    await expect(
      Effect.runPromise(
        createEvent(
          {
            name: "Event",
            world: "   ",
            heroNpcs: [],
          },
          { id: "guild-1" },
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
