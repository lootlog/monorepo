import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getEventsMonitoringControllerGetCoordinationQueryKey } from "@lootlog/client/main";
import { expect, it, onTestFinished, vi } from "vitest";
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
