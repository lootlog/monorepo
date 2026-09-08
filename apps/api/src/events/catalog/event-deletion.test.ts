import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { describe, expect, it, mock } from "bun:test";

import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { makeEventDeletion } from "#src/events/catalog/event-deletion";

describe("event deletion Effect module", () => {
  it("does not inspect queues or cache when the scoped event is absent", async () => {
    const pending = mock(() => Promise.resolve([]));
    const delayed = mock(() => Promise.resolve([]));
    const boundary = await createDatabaseBoundary();
    try {
      const removeEvent = makeEventDeletion(
        boundary.database,
        {
          deleteByPattern: () =>
            Promise.reject(new Error("Unexpected cache invalidation")),
        },
        { pending, delayed },
        {
          warn: () => {
            throw new Error("Unexpected warning");
          },
        },
      );

      await expect(
        boundary.run(removeEvent({ id: "guild-1" }, "event-1")),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(pending).not.toHaveBeenCalled();
      expect(delayed).not.toHaveBeenCalled();
    } finally {
      await boundary.dispose();
    }
  });
});
