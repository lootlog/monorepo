import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { applicationLogger as logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import { describe, expect, it } from "bun:test";

import type { CreateKillRequest } from "#src/contracts/kills/schemas";
import {
  KillCreationError,
  makeKillCreation,
  type KillCreationCache,
} from "./kill-creation.js";

const payload = {
  world: "tempest",
  accountId: "account-1",
  characterId: "character-1",
  npc: { id: 123, name: "Mushita", lvl: 100, wt: 80 },
} satisfies CreateKillRequest;

describe("kill creation Effect module", () => {
  it("returns the established dedup response without touching Drizzle", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const cache: KillCreationCache = {
        deleteByPattern: () => Effect.succeed(0),
        setNx: () => Effect.succeed(false),
      };
      const createKill = makeKillCreation(boundary.database, cache, logger);

      await expect(
        boundary.run(createKill("discord-1", payload)),
      ).resolves.toEqual({ deduplicated: true, updated: 0 });
    } finally {
      await boundary.dispose();
    }
  });

  it("maps a Redis dedup failure to the typed module error", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const cache: KillCreationCache = {
        deleteByPattern: () => Effect.succeed(0),
        setNx: () => Effect.fail(new Error("redis unavailable")),
      };
      const createKill = makeKillCreation(boundary.database, cache, logger);

      await expect(
        boundary.run(createKill("discord-1", payload)),
      ).rejects.toBeInstanceOf(KillCreationError);
    } finally {
      await boundary.dispose();
    }
  });
});
