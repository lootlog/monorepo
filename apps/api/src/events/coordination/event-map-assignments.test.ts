import {
  eventTable,
  eventHeroNpcTable,
  eventMapTable,
  guildTable,
} from "#src/database/drizzle/schema";
import { RoutingKey } from "#src/rabbitmq/routing-key";
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

it.each([300, null])(
  "publishes source hero visibility after unassigning a map (%s)",
  async (npcLvl) => {
    const boundary = await createDatabaseBoundary();
    const publish = mock(() => Effect.void);

    try {
      await boundary.run(
        boundary.database.insert(guildTable).values({
          id: "guild-1",
          name: "Guild",
          ownerId: "owner",
          updatedAt: new Date(),
        }),
      );
      await boundary.run(
        boundary.database.insert(eventTable).values({
          id: "event-1",
          guildId: "guild-1",
          name: "Event",
          world: "world",
          updatedAt: new Date(),
        }),
      );
      await boundary.run(
        boundary.database.insert(eventHeroNpcTable).values({
          id: "hero-1",
          eventId: "event-1",
          npcName: "Hero",
          npcLvl,
        }),
      );
      await boundary.run(
        boundary.database.insert(eventMapTable).values({
          id: "map-1",
          heroNpcId: "hero-1",
          mapId: 1,
          mapName: "Map",
          updatedAt: new Date(),
        }),
      );

      const assignments = makeEventMapAssignments(
        boundary.database,
        { deleteByPattern: () => Promise.resolve(0) },
        { getEventRespawnTimer: () => Effect.die("Unexpected timer read") },
        { publish },
        { warn: () => {} },
      );

      const result = await boundary.run(
        assignments.unassignMember({ id: "guild-1" }, "event-1", "map-1"),
      );

      expect(result?.assignedMembers).toEqual([]);
      expect(publish).toHaveBeenCalledWith(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
        guildId: "guild-1",
        eventId: "event-1",
        mapId: "map-1",
        heroNpcLvl: npcLvl,
      });
    } finally {
      await boundary.dispose();
    }
  },
);
