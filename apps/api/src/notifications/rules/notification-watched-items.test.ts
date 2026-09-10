import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";

import { InvalidRequestError } from "#src/shared/http/http-errors";
import { makeNotificationWatchedItems } from "#src/notifications/rules/notification-watched-items";

describe("notification watched items Effect module", () => {
  it("rejects an empty guild selection before adapters are used", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const listGuilds = mock(() => Effect.die("unexpected guild lookup"));
      const cancel = mock(() => Effect.die("unexpected job cancellation"));

      const watchedItems = makeNotificationWatchedItems(
        boundary.database,
        { list: listGuilds },
        { cancel },
      );

      await expect(
        boundary.run(
          watchedItems.create("discord-1", "user-1", {
            itemId: 1,
            itemName: "Item",
            world: "world",
            guildIds: [],
          }),
        ),
      ).rejects.toBeInstanceOf(InvalidRequestError);
      expect(listGuilds).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
    } finally {
      await boundary.dispose();
    }
  });
});
