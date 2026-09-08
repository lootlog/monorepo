import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { makeEventCreation } from "#src/events/catalog/event-creation";

describe("event creation Effect module", () => {
  it("rejects an empty normalized world before database access", async () => {
    const createEvent = makeEventCreation(
      { transaction: () => Effect.die("Unexpected database access") },
      {
        deleteByPattern: () =>
          Promise.reject(new Error("Unexpected cache invalidation")),
      },
      {
        warn: () => {
          throw new Error("Unexpected warning");
        },
      },
    );

    await expect(
      Effect.runPromise(
        createEvent(
          {
            name: "Event",
            world: "   ",
            heroNpcs: [],
          },
          { id: "guild-1" },
        ),
      ),
    ).rejects.toBeInstanceOf(InvalidRequestError);
  });
});
