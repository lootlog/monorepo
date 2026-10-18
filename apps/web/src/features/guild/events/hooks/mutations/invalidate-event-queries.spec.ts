import { QueryClient } from "@tanstack/react-query";
import { expect, it, onTestFinished } from "vitest";
import { invalidateGapQueries } from "./invalidate-map-queries";
import { invalidateRespawnQueries } from "./invalidate-respawn-queries";

it.each([
  [
    "map gap",
    (client: QueryClient) =>
      invalidateGapQueries(client, "guild-1", "event-1", "map-1"),
  ],
  [
    "respawn",
    (client: QueryClient) =>
      invalidateRespawnQueries(client, "guild-1", "event-1", "hero-1"),
  ],
])(
  "refreshes hero gaps only in the affected organization and event after a %s change",
  async (_, invalidate) => {
    const queryClient = new QueryClient();
    onTestFinished(() => queryClient.clear());

    const affected = [
      ["/guilds/guild-1/events/event-1/heroes/hero-1/active-gaps"],
      [
        "/guilds/guild-1/events/event-1/heroes/hero-2/coverage-gaps",
        { limit: 10 },
      ],
    ];

    const unaffected = [
      ["/guilds/guild-2/events/event-1/heroes/hero-1/active-gaps"],
      ["/guilds/guild-1/events/event-2/heroes/hero-1/coverage-gaps"],
      ["/guilds/guild-1/events/event-1/heroes/hero-1/kills"],
      [{ scope: "unrelated" }],
    ];

    for (const key of [...affected, ...unaffected]) {
      queryClient.setQueryData(key, { items: [] });
    }

    await invalidate(queryClient);

    for (const key of affected) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }

    for (const key of unaffected) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
  },
);
