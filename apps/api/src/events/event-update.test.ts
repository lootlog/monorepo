import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { RedisService } from "#src/redis/redis.service";
import { BadRequestException } from "#src/shared/http/http-errors";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { UpdateEventDto } from "#src/http-api/lootlog-api";
import type { EventsCatalogRead } from "./events-catalog-read.js";
import { makeEventUpdate } from "./event-update.js";

describe("event update Effect module", () => {
  it("rejects an inverted date range before opening a transaction", async () => {
    const transaction = mock(() => Effect.die("unexpected transaction"));
    const select = () => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Effect.succeed([
              {
                id: "event-1",
                guildId: "guild-1",
                startsAt: new Date("2026-09-02T10:00:00.000Z"),
                endsAt: new Date("2026-09-02T12:00:00.000Z"),
                createdAt: new Date("2026-09-01T10:00:00.000Z"),
                scoringMode: "SIMPLE",
                scoringRules: null,
              },
            ]),
        }),
      }),
    });
    const updateEvent = makeEventUpdate(
      { select, transaction } as unknown as typeof ApiDatabase.Service,
      {} as RedisService,
      {} as EventsCatalogRead,
      {} as ApplicationLogger,
    );

    await expect(
      Effect.runPromise(
        updateEvent({ id: "guild-1" }, "event-1", {
          startsAt: "2026-09-02T13:00:00.000Z",
          endsAt: "2026-09-02T12:00:00.000Z",
        } as UpdateEventDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
