import { Effect } from "effect";
import { describe, expect, it } from "bun:test";
import type { ApiDatabase } from "#src/database/drizzle/database";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { CreateKillDto } from "./dto/create-kill.dto.js";
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
} as CreateKillDto;

const logger = {
  error: () => undefined,
  log: () => undefined,
  warn: () => undefined,
} as unknown as ApplicationLogger;

describe("kill creation Effect module", () => {
  it("returns the established dedup response without touching Drizzle", async () => {
    const cache: KillCreationCache = {
      deleteByPattern: () => Effect.succeed(0),
      setNx: () => Effect.succeed(false),
    };
    const createKill = makeKillCreation(
      {} as typeof ApiDatabase.Service,
      cache,
      logger,
    );

    await expect(
      Effect.runPromise(createKill("discord-1", payload)),
    ).resolves.toEqual({ deduplicated: true, updated: 0 });
  });

  it("maps a Redis dedup failure to the typed module error", async () => {
    const cache: KillCreationCache = {
      deleteByPattern: () => Effect.succeed(0),
      setNx: () => Effect.fail(new Error("redis unavailable")),
    };
    const createKill = makeKillCreation(
      {} as typeof ApiDatabase.Service,
      cache,
      logger,
    );

    await expect(
      Effect.runPromise(createKill("discord-1", payload)),
    ).rejects.toBeInstanceOf(KillCreationError);
  });
});
