import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getEventsMonitoringControllerGetCoordinationQueryKey } from "@lootlog/client/main";
import { expect, it, onTestFinished, vi } from "vitest";
import { invalidateGapQueries } from "./invalidate-map-queries";
import { invalidateKillQueries } from "./invalidate-kill-queries";
import { invalidateRespawnQueries } from "./invalidate-respawn-queries";

it("shares and awaits the coordination refresh when closing a window also updates kills", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  onTestFinished(() => queryClient.clear());

  const queryKey = getEventsMonitoringControllerGetCoordinationQueryKey({
    guildId: "guild-alias",
    eventId: "event-1",
  });

  queryClient.setQueryData(queryKey, { heroes: [] });
  const fetchCoordination = vi.fn(async () => ({ heroes: ["updated"] }));

  const observer = new QueryObserver(queryClient, {
    queryKey,
    queryFn: fetchCoordination,
  });

  onTestFinished(observer.subscribe(() => {}));

  await Promise.all([
    invalidateRespawnQueries(queryClient, "guild-alias", "event-1", "hero-1"),
    invalidateKillQueries(queryClient, "guild-alias", "event-1", {
      invalidateCoordination: false,
    }),
  ]);

  expect(fetchCoordination).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData(queryKey)).toEqual({ heroes: ["updated"] });
});

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
