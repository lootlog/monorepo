import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { applicationLogger as logger } from "#src/shared/application-logger";
import type { KillQueryCache } from "./kill-query-support.js";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "bun:test";

import {
  makeUserKillQueries,
  UserKillQueriesError,
} from "./user-kill-queries.js";
import { makeKillCreation, type KillCreationCache } from "./kill-creation.js";
import type { CreateKillRequest } from "#src/contracts/kills/schemas";
import {
  userKillBucketTable,
  userKillTotalTable,
} from "#src/database/drizzle/schema";

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

describe("per-character personal kills", () => {
  const passthrough: KillQueryCache = {
    getOrSet: (_key, _schema, load) => load,
  };

  const kill = (
    characterId: string,
    character?: CreateKillRequest["character"],
  ): CreateKillRequest => {
    const request = {
      world: "tempest",
      accountId: "account-1",
      characterId,
      npc: { id: 123, name: "Mushita", lvl: 100, wt: 80 },
    };

    return character ? { ...request, character } : request;
  };

  const details = (name: string) => ({ name, lvl: 80, prof: "w" });

  it("counts each kill once for the account and once for the character that reported it first", async () => {
    const boundary = await createDatabaseBoundary();
    const claims = new Set<string>();

    const cache: KillCreationCache = {
      invalidateScopes: () => Effect.succeed(0),
      deleteIfValue: () => Effect.succeed(0),
      setNx: (key) =>
        Effect.sync(() => !claims.has(key) && Boolean(claims.add(key))),
    };

    try {
      const createKill = makeKillCreation(boundary.database, cache, logger);

      // A kill from before per-character tracking: account-wide only.
      const earlier = new Date(Date.now() - 2 * 86_400_000);
      earlier.setUTCMinutes(0, 0, 0);

      const legacy = {
        discordUserId: "discord-1",
        world: "tempest",
        npcId: 123,
        npcName: "Mushita",
        npcType: "ELITE" as const,
        npcLvl: 100,
        kills: 5,
        lastKilledAt: earlier,
      };

      await boundary.run(
        boundary.database.insert(userKillTotalTable).values(legacy),
      );
      await boundary.run(
        boundary.database
          .insert(userKillBucketTable)
          .values({ ...legacy, periodStart: earlier }),
      );

      await boundary.run(
        createKill("discord-1", kill("char-a", details("Alpha"))),
      );
      // The same kill reported by a second character in the party.
      await boundary.run(
        createKill("discord-1", kill("char-b", details("Beta"))),
      );
      claims.clear();
      // An older Game client reports only the character id.
      await boundary.run(createKill("discord-1", kill("char-b")));
      claims.clear();
      await boundary.run(createKill("discord-1", kill("char-a")));

      const queries = makeUserKillQueries(
        boundary.database,
        passthrough,
        logger,
      );

      const { characters } = await boundary.run(
        queries.getUserKillCharacters("discord-1"),
      );

      expect(
        characters
          .map(({ characterId, name, kills }) => ({ characterId, name, kills }))
          .sort((a, b) => a.characterId.localeCompare(b.characterId)),
      ).toEqual([
        { characterId: "char-a", name: "Alpha", kills: 2 },
        { characterId: "char-b", name: null, kills: 1 },
      ]);

      const account = await boundary.run(
        queries.getUserKillAnalytics("discord-1", { days: 7 }),
      );

      expect(account.meta.allTimeKills).toBe(8);
      expect(account.overview.totalKills).toBe(8);
      expect(account.meta.trackedSince).toBeNull();

      const alpha = await boundary.run(
        queries.getUserKillAnalytics("discord-1", {
          days: 7,
          characterId: "char-a",
        }),
      );

      expect(alpha.meta.characterId).toBe("char-a");
      expect(alpha.meta.allTimeKills).toBe(2);
      expect(alpha.overview.totalKills).toBe(2);
      expect(alpha.meta.coverage).toBe("partial");
      expect(alpha.npcs.map(({ totalKills }) => totalKills)).toEqual([2]);
      // The legacy day is unknown for a character, never zero.
      expect(alpha.daily.slice(0, 6).every((day) => day.kills === null)).toBe(
        true,
      );

      const beta = await boundary.run(
        queries.getUserKillActivity("discord-1", { characterId: "char-b" }),
      );

      expect(beta.daily.reduce((sum, day) => sum + (day.kills ?? 0), 0)).toBe(
        1,
      );
      expect(beta.meta.trackedSince).toBe(alpha.meta.trackedSince);
    } finally {
      await boundary.dispose();
    }
  });
});
