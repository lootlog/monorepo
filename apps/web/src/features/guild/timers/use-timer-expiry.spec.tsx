// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { getTimersControllerGetTimersQueryKey } from "@lootlog/client/main";
import { useTimerExpiry } from "./use-timer-expiry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("refreshes simultaneous expiries once, preserves scope, and handles a reset timer", async () => {
  vi.useFakeTimers();
  vi.setSystemTime("2026-09-05T12:00:00Z");

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const queryKey = getTimersControllerGetTimersQueryKey(
    { guildId: "one" },
    { world: "tempest" },
  );

  const otherKey = getTimersControllerGetTimersQueryKey(
    { guildId: "two" },
    { world: "tempest" },
  );

  const fetchTimers = vi.fn(async () => []);

  const observer = new QueryObserver(client, {
    queryKey,
    queryFn: fetchTimers,
    initialData: [],
    staleTime: Infinity,
  });

  const unsubscribe = observer.subscribe(() => undefined);
  client.setQueryData(otherKey, []);

  const timers = Array.from({ length: 100 }, (_, index) => ({
    timerKey: String(index),
    maxSpawnTime: "2026-09-05T12:00:01Z",
  }));

  const recordRender = vi.fn();

  const { rerender, unmount } = renderHook(
    ({ currentTimers }) => {
      recordRender();
      useTimerExpiry(
        currentTimers,
        "one",
        "tempest",
        Date.parse("2026-09-05T12:00:00Z"),
      );
    },
    {
      initialProps: { currentTimers: timers },
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(fetchTimers).toHaveBeenCalledTimes(1);
  expect(recordRender).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(fetchTimers).toHaveBeenCalledTimes(1);
  rerender({
    currentTimers: [{ timerKey: "0", maxSpawnTime: "2026-09-05T12:00:03Z" }],
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(fetchTimers).toHaveBeenCalledTimes(2);
  unmount();
  unsubscribe();
  client.clear();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([
  { expiredAt: "2026-09-05T11:55:00Z", refetches: 0 },
  { expiredAt: "2026-09-05T11:59:59Z", refetches: 1 },
])(
  "refetches a timer that expired at $expiredAt, before a response received at noon, $refetches times",
  async ({ expiredAt, refetches }) => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-09-05T12:00:00Z");

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });

    const queryKey = getTimersControllerGetTimersQueryKey(
      { guildId: "one" },
      { world: "tempest" },
    );

    const fetchTimers = vi.fn(async () => []);

    const unsubscribe = new QueryObserver(client, {
      queryKey,
      queryFn: fetchTimers,
      initialData: [],
      staleTime: Infinity,
    }).subscribe(() => undefined);

    const { unmount } = renderHook(
      () =>
        useTimerExpiry(
          [{ timerKey: "expired", maxSpawnTime: expiredAt }],
          "one",
          "tempest",
          Date.parse("2026-09-05T12:00:00Z"),
        ),
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fetchTimers).toHaveBeenCalledTimes(refetches);
    unmount();
    unsubscribe();
    client.clear();
  },
);
