import { describe, expect, it, mock } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger } from "#src/shared/application-logger";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";

describe("event catalog read Effect module", () => {
  it("returns the established cached overview without touching Drizzle", async () => {
    const cachedEvent = {
      id: "event-1",
      guildId: "guild-1",
      name: "Event",
      world: "tempest",
      startsAt: new Date("2026-08-16T10:00:00.000Z"),
      endsAt: null,
      createdAt: new Date("2026-08-16T09:00:00.000Z"),
      updatedAt: new Date("2026-08-16T09:00:00.000Z"),
      basePointsPerKill: 1,
      assignmentTimeoutMinutes: 5,
      participationConfirmationMinutes: 0,
      mapAssignmentCap: null,
      scoringMode: "SIMPLE" as const,
      scoringRules: null,
      rulebookMarkdown: null,
      active: true,
      heroNpcs: [],
    };
    const getJson = mock(() => Promise.resolve(cachedEvent));
    const redis = { getJson } as unknown as RedisService;
    const database = new Proxy(
      {},
      {
        get: () => () => Promise.reject(new Error("unexpected database call")),
      },
    ) as typeof ApiDatabase.Service;
    const logger = {
      warn: mock(() => undefined),
    } as unknown as ApplicationLogger;

    const catalog = makeEventsCatalogRead(database, redis, logger);
    const result = await Effect.runPromise(
      catalog.getEvent(
        { id: "guild-1" },
        "event-1",
        [],
        createAccessPolicy({ capabilities: [] }),
      ),
    );

    expect(result).toEqual(cachedEvent);
    expect(getJson).toHaveBeenCalledTimes(1);
  });
});
