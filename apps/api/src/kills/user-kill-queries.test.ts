import { Effect, Schema } from "effect";
import { describe, expect, it } from "bun:test";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { KillsControllerGetUserKillStatsQuery as GetUserKillStatsDto } from "#src/http-api/lootlog-api";
import {
  makeUserKillQueries,
  type UserKillQueriesCache,
  UserKillQueriesError,
} from "./user-kill-queries.js";

const logger = {
  error: () => undefined,
  log: () => undefined,
  warn: () => undefined,
} as unknown as ApplicationLogger;

describe("user kill queries Effect module", () => {
  it("returns a cached overview without touching Drizzle", async () => {
    const expected = {
      overview: {
        totalKills: 3,
        killsByType: { HERO: 3 },
        killsByWorld: { tempest: 3 },
      },
      topNpcs: [] as Array<{
        npcId: number;
        npcName: string;
        npcType: string;
        npcLvl: number;
        npcProf: string | null;
        npcIcon: string | null;
        totalKills: number;
      }>,
    };
    let observedKey = "";
    const cache: UserKillQueriesCache = {
      get: (key, schema) => {
        observedKey = key;
        return Effect.sync(() => Schema.decodeUnknownSync(schema)(expected));
      },
      set: () => Effect.die("cache set must not run on a hit"),
    };
    const queries = makeUserKillQueries(
      {} as typeof ApiDatabase.Service,
      cache,
      logger,
    );

    await expect(
      Effect.runPromise(
        queries.getUserKillStats("discord-1", {} as GetUserKillStatsDto),
      ),
    ).resolves.toEqual(expected);
    expect(observedKey).toStartWith("kill-stats:user-overview:discord-1:");
  });

  it("maps a cache failure to the typed module error", async () => {
    const cache: UserKillQueriesCache = {
      get: () => Effect.fail(new Error("redis unavailable")),
      set: () => Effect.void,
    };
    const queries = makeUserKillQueries(
      {} as typeof ApiDatabase.Service,
      cache,
      logger,
    );

    await expect(
      Effect.runPromise(
        queries.getUserKillStats("discord-1", {} as GetUserKillStatsDto),
      ),
    ).rejects.toBeInstanceOf(UserKillQueriesError);
  });
});
