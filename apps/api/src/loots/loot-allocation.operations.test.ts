import { Effect } from "effect";
import { describe, expect, it } from "bun:test";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { LootAllocationPersistence } from "./loot-allocation-persistence.js";
import {
  LootAllocationOperationError,
  makeLootAllocationOperations,
} from "./loot-allocation.operations.js";

const logger = {
  error: () => undefined,
  log: () => undefined,
  warn: () => undefined,
} as unknown as ApplicationLogger;

describe("loot allocation Effect module", () => {
  it("rejects an unauthorized allocation before cache or RabbitMQ", async () => {
    let externalCalls = 0;
    const operations = makeLootAllocationOperations({
      persistence: {
        findAuthorizedLoot: () => Effect.succeed(null),
      } as unknown as LootAllocationPersistence,
      cache: {
        deleteByPattern: () => {
          externalCalls += 1;
          return Effect.void;
        },
      },
      publisher: {
        publish: () => {
          externalCalls += 1;
          return Effect.void;
        },
      },
      logger,
    });

    await expect(
      Effect.runPromise(
        operations.confirmFromChat({
          actorUserId: "user-1",
          lootId: 42,
          message: "allocation",
        }),
      ),
    ).rejects.toBeInstanceOf(LootAllocationOperationError);
    expect(externalCalls).toBe(0);
  });
});
