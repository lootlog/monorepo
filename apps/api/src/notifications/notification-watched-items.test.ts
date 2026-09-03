import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { makeNotificationWatchedItems } from "./notification-watched-items.js";

describe("notification watched items Effect module", () => {
  it("rejects an empty guild selection before adapters are used", async () => {
    const listGuilds = mock(() => Effect.die("unexpected guild lookup"));
    const cancel = mock(() => Effect.die("unexpected job cancellation"));
    const watchedItems = makeNotificationWatchedItems(
      {} as ApiDatabaseValue,
      { list: listGuilds },
      { cancel },
    );

    await expect(
      Effect.runPromise(
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
  });
});
