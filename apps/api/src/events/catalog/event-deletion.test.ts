import {
  eventTable,
  eventHeroNpcTable,
  guildTable,
} from "#src/database/drizzle/schema";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { describe, expect, it, mock } from "bun:test";

import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { makeEventDeletion } from "#src/events/catalog/event-deletion";

describe("event deletion Effect module", () => {
  it.each([false, true])(
    "does not delete an absent event or an event containing hidden heroes (%s)",
    async (hasHiddenHero) => {
      const pending = mock(() => Promise.resolve([]));
      const delayed = mock(() => Promise.resolve([]));
      const boundary = await createDatabaseBoundary();

      try {
        if (hasHiddenHero) {
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
              id: "hidden",
              eventId: "event-1",
              npcName: "Hidden",
              npcLvl: 300,
            }),
          );
        }

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
          boundary.run(
            removeEvent(
              { id: "guild-1" },
              "event-1",
              [],
              createAccessPolicy({ capabilities: [] }),
            ),
          ),
        ).rejects.toBeInstanceOf(ResourceNotFoundError);
        expect(pending).not.toHaveBeenCalled();
        expect(delayed).not.toHaveBeenCalled();
        expect(
          await boundary.run(boundary.database.select().from(eventTable)),
        ).toHaveLength(hasHiddenHero ? 1 : 0);
        expect(
          await boundary.run(
            boundary.database.select().from(eventHeroNpcTable),
          ),
        ).toHaveLength(hasHiddenHero ? 1 : 0);
      } finally {
        await boundary.dispose();
      }
    },
  );
});
