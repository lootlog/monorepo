import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { RedisService } from "#src/redis/redis.service";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { EventTimersPort } from "./services/event-timers.port.js";
import { makeEventMapAssignments } from "./event-map-assignments.js";

describe("event map assignments Effect module", () => {
  it("rejects an unscoped map before reading timers or publishing", async () => {
    const getEventRespawnTimer = mock(() =>
      Effect.die("unexpected timer read"),
    );
    const publish = mock(() => Effect.die("unexpected publish"));
    const select = () => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({ limit: () => Effect.succeed([]) }),
          }),
        }),
      }),
    });
    const assignments = makeEventMapAssignments(
      { select } as unknown as typeof ApiDatabase.Service,
      {} as RedisService,
      { getEventRespawnTimer } as unknown as EventTimersPort,
      { publish },
      {} as ApplicationLogger,
    );

    await expect(
      Effect.runPromise(
        assignments.assignMember({ id: "guild-1" }, "event-1", "map-1", 1),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(getEventRespawnTimer).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
