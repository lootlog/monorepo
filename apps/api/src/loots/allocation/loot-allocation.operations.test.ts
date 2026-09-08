import { applicationLogger as logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import { describe, expect, it } from "bun:test";
import {
  LootAllocationOperationError,
  makeLootAllocationOperations,
} from "#src/loots/allocation/loot-allocation.operations";

describe("loot allocation Effect module", () => {
  it("rejects an unauthorized allocation before cache or RabbitMQ", async () => {
    let externalCalls = 0;
    const operations = makeLootAllocationOperations({
      persistence: {
        findAuthorizedLoot: () => Effect.succeed(null),
        compareAndSetChatAllocation: () =>
          Effect.die("Unexpected allocation write"),
        findAuthorizedAllocationState: () =>
          Effect.die("Unexpected allocation state read"),
      },
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
