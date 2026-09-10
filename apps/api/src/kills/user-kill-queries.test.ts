import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { applicationLogger as logger } from "#src/shared/application-logger";
import type { KillQueryCache } from "./kill-query-support.js";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "bun:test";

import {
  makeUserKillQueries,
  UserKillQueriesError,
} from "./user-kill-queries.js";

describe("user kill queries Effect module", () => {
  it("returns a cached overview without touching Drizzle", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const expected = {
        overview: {
          totalKills: 3,
          killsByType: { HERO: 3 },
          killsByWorld: { tempest: 3 },
        },
        topNpcs: [],
      };

      let observedKey = "";

      const cache: KillQueryCache = {
        getOrSet: (key, schema) => {
          observedKey = key;

          return Effect.sync(() => Schema.decodeUnknownSync(schema)(expected));
        },
      };

      const queries = makeUserKillQueries(boundary.database, cache, logger);

      await expect(
        boundary.run(queries.getUserKillStats("discord-1", {})),
      ).resolves.toEqual(expected);
      expect(observedKey).toStartWith("kill-stats:user-overview:discord-1:");
    } finally {
      await boundary.dispose();
    }
  });

  it("maps a cache failure to the typed module error", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const cache: KillQueryCache = {
        getOrSet: () => Effect.fail(new Error("redis unavailable")),
      };

      const queries = makeUserKillQueries(boundary.database, cache, logger);

      await expect(
        boundary.run(queries.getUserKillStats("discord-1", {})),
      ).rejects.toBeInstanceOf(UserKillQueriesError);
    } finally {
      await boundary.dispose();
    }
  });
});
