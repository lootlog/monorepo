// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { GatewayClient } from "@/lib/gateway-client";
import { useKillStatsUpdates } from "./use-kill-stats-updates";

vi.mock("@/lib/gateway-client", () => ({
  GatewayClient: class {
    on() {
      return this;
    }
    off() {
      return this;
    }
  },
}));

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("coalesces kill hints, refreshes active statistics without attributing kills, and leaves feed untouched", async () => {
  vi.useFakeTimers();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  const socket = new GatewayClient();
  const handlers = new Map<GatewayEvent, () => void>();
  vi.spyOn(socket, "on").mockImplementation((event, handler) => {
    handlers.set(event, handler);
    return socket;
  });
  vi.spyOn(socket, "off").mockImplementation((event) => {
    handlers.delete(event);
    return socket;
  });
  const totals = ["/users/@me/stats/kills", { world: "alpha" }];
  const activity = ["/users/@me/stats/kills/activity", { from: "2026-01-01" }];
  const analytics = ["/users/@me/stats/kills/analytics", { days: "30" }];
  const npcs = ["/users/@me/kills/npcs"];
  const feed = ["/users/@me/feed"];
  for (const key of [totals, activity, analytics, npcs, feed])
    client.setQueryData(key, 10);
  const queryFn = vi.fn().mockResolvedValue(10);
  const observer = new QueryObserver(client, {
    queryKey: totals,
    queryFn,
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  const { unmount } = renderHook(() => useKillStatsUpdates(socket), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  act(() => {
    for (let i = 0; i < 20; i++) handlers.get(GatewayEvent.KILLS_CHANGED)?.();
  });
  expect(queryFn).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1_000));
  expect(queryFn).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(totals)).toBe(10);
  for (const key of [activity, analytics, npcs])
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryState(feed)?.isInvalidated).toBe(false);
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(queryFn).toHaveBeenCalledTimes(1);
  act(() => handlers.get(GatewayEvent.JOIN)?.());
  await act(() => vi.advanceTimersByTimeAsync(1_000));
  expect(queryFn).toHaveBeenCalledTimes(2);
  act(() => handlers.get(GatewayEvent.KILLS_CHANGED)?.());
  unmount();
  await vi.advanceTimersByTimeAsync(1_000);
  expect(queryFn).toHaveBeenCalledTimes(2);
  expect(handlers.size).toBe(0);
  unsubscribe();
});
