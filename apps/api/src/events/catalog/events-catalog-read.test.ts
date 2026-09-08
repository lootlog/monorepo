import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import superjson from "superjson";
import { describe, expect, it, mock } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Effect } from "effect";

import type { RedisGetOrSetJsonBestEffortOptions } from "#src/redis/redis.service";

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
    const cacheRead = mock(() => undefined);
    const redis = {
      getOrSetJsonEffect<T, E>(
        options: Omit<RedisGetOrSetJsonBestEffortOptions<T>, "factory"> & {
          factory: Effect.Effect<T, E>;
        },
      ) {
        cacheRead();
        return Effect.succeed(
          options.codec.parse(superjson.stringify(cachedEvent)),
        );
      },
    };
    const boundary = await createDatabaseBoundary();
    try {
      const logger = { warn: mock(() => undefined) };

      const catalog = makeEventsCatalogRead(boundary.database, redis, logger);
      const result = await boundary.run(
        catalog.getEvent(
          { id: "guild-1" },
          "event-1",
          [],
          createAccessPolicy({ capabilities: [] }),
        ),
      );

      expect(result).toEqual(cachedEvent);
      expect(cacheRead).toHaveBeenCalledTimes(1);
    } finally {
      await boundary.dispose();
    }
  });
});
