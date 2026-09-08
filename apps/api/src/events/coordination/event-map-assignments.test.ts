import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { makeEventMapAssignments } from "#src/events/coordination/event-map-assignments";

describe("event map assignments Effect module", () => {
  it("rejects an unscoped map before reading timers or publishing", async () => {
    const getEventRespawnTimer = mock(() =>
      Effect.die("unexpected timer read"),
    );
    const publish = mock(() => Effect.die("unexpected publish"));
    const boundary = await createDatabaseBoundary();
    try {
      const assignments = makeEventMapAssignments(
        boundary.database,
        {
          deleteByPattern: () =>
            Promise.reject(new Error("Unexpected cache invalidation")),
        },
        { getEventRespawnTimer },
        { publish },
        {
          warn: () => {
            throw new Error("Unexpected warning");
          },
        },
      );

      await expect(
        boundary.run(
          assignments.assignMember({ id: "guild-1" }, "event-1", "map-1", 1),
        ),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
      expect(getEventRespawnTimer).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    } finally {
      await boundary.dispose();
    }
  });
});
