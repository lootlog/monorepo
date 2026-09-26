import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersCache } from "./use-timers-cache";
import {
  createTimerFixture as createTimer,
  createTimerHistoryFixture,
} from "@/features/timers/timer-fixtures";
import {
  getTimersControllerGetRecentTimerHistoryQueryKey,
  getTimersControllerGetTimerHistoryQueryKey,
} from "@lootlog/client/main";

describe("useTimersCache", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("keeps an unseen timer list fetchable after an incremental upsert", async () => {
    const fetchTimers = vi
      .fn<() => Promise<Timer[]>>()
      .mockResolvedValue([createTimer({ timerKey: "server-timer" })]);

    const { result } = renderHook(() => useTimersCache(), { wrapper });

    result.current.upsertTimer(createTimer({ timerKey: "socket-timer" }));

    const timers = await queryClient.fetchQuery({
      queryKey: queryKeys.timers("luvia"),
      queryFn: fetchTimers,
      staleTime: 30_000,
    });

    expect(fetchTimers).toHaveBeenCalledOnce();
    expect(timers).toEqual([createTimer({ timerKey: "server-timer" })]);
  });

  it("keeps an unseen timer list fetchable after an incremental removal", async () => {
    const serverTimers = [createTimer({ timerKey: "server-timer" })];

    const fetchTimers = vi
      .fn<() => Promise<Timer[]>>()
      .mockResolvedValue(serverTimers);

    const { result } = renderHook(() => useTimersCache(), { wrapper });

    result.current.removeTimer({
      world: "luvia",
      guildId: "guild-1",
      timerKey: "socket-timer",
    });

    const timers = await queryClient.fetchQuery({
      queryKey: queryKeys.timers("luvia"),
      queryFn: fetchTimers,
      staleTime: 30_000,
    });

    expect(fetchTimers).toHaveBeenCalledOnce();
    expect(timers).toEqual(serverTimers);
  });

  it("upserts timers by identity and clears their pending flag", () => {
    queryClient.setQueryData(queryKeys.timers("luvia"), [
      createTimer({
        isPending: true,
      }),
    ]);

    const { result } = renderHook(() => useTimersCache(), { wrapper });

    result.current.upsertTimer(
      createTimer({
        isPending: true,
        updatedAt: "2026-04-22T10:01:00.000Z",
      }),
    );

    expect(queryClient.getQueryData(queryKeys.timers("luvia"))).toEqual([
      expect.objectContaining({
        updatedAt: "2026-04-22T10:01:00.000Z",
        isPending: false,
      }),
    ]);
  });

  it("appends new timers and removes them by world, guild, and key", () => {
    queryClient.setQueryData(queryKeys.timers("luvia"), [
      createTimer({
        timerKey: "timer-1",
      }),
      createTimer({
        timerKey: "timer-2",
        npc: {
          ...createTimer().npc,
          name: "Mushita",
        },
      }),
    ]);

    const { result } = renderHook(() => useTimersCache(), { wrapper });

    result.current.upsertTimer(
      createTimer({
        timerKey: "timer-3",
        npc: {
          ...createTimer().npc,
          name: "Raróg",
        },
      }),
    );
    result.current.removeTimer({
      world: "luvia",
      guildId: "guild-1",
      timerKey: "timer-2",
    });

    expect(
      (queryClient.getQueryData<Timer[]>(queryKeys.timers("luvia")) ?? []).map(
        (timer) => timer.timerKey,
      ),
    ).toEqual(["timer-1", "timer-3"]);
  });

  it("does not refetch the full timers query after an authoritative socket delete", () => {
    queryClient.setQueryData(queryKeys.timers("luvia"), [
      createTimer({
        timerKey: "timer-1",
      }),
    ]);
    const fetchTimers = vi.fn<() => Promise<Timer[]>>().mockResolvedValue([]);

    const observer = new QueryObserver(queryClient, {
      queryKey: queryKeys.timers("luvia"),
      queryFn: fetchTimers,
      staleTime: 30_000,
    });

    const unsubscribe = observer.subscribe(() => {});

    const { result } = renderHook(() => useTimersCache(), { wrapper });

    result.current.removeTimer({
      world: "luvia",
      guildId: "guild-1",
      timerKey: "timer-1",
    });

    expect(queryClient.getQueryData(queryKeys.timers("luvia"))).toEqual([]);
    expect(fetchTimers).not.toHaveBeenCalled();
    unsubscribe();
  });

  it.each(["upsert", "remove"] as const)(
    "refreshes both histories only in the %s timer's organization and world, regardless of page limit",
    async (operation) => {
      const timer = createTimer();

      const globalKey = getTimersControllerGetRecentTimerHistoryQueryKey({
        guildId: timer.guildId,
        world: timer.world,
        limit: 10,
      });

      const detailKey = getTimersControllerGetTimerHistoryQueryKey(
        { guildId: timer.guildId, timerIdentifier: timer.timerKey },
        { world: timer.world, limit: 5 },
      );

      const closedKey = getTimersControllerGetRecentTimerHistoryQueryKey({
        guildId: timer.guildId,
        world: timer.world,
        limit: 25,
      });

      const unrelatedKeys = [
        getTimersControllerGetRecentTimerHistoryQueryKey({
          guildId: "guild-2",
          world: timer.world,
          limit: 10,
        }),
        getTimersControllerGetRecentTimerHistoryQueryKey({
          guildId: timer.guildId,
          world: "other-world",
          limit: 10,
        }),
        getTimersControllerGetTimerHistoryQueryKey(
          { guildId: timer.guildId, timerIdentifier: "other-timer" },
          { world: timer.world, limit: 5 },
        ),
      ];

      for (const key of [globalKey, detailKey, closedKey, ...unrelatedKeys])
        queryClient.setQueryData(key, ["old"]);
      const fetchHistory = vi.fn(async () => ["fresh"]);

      const observers = [globalKey, detailKey, closedKey].map(
        (queryKey, index) =>
          new QueryObserver(queryClient, {
            queryKey,
            queryFn: fetchHistory,
            staleTime: 30_000,
            enabled: index < 2,
          }),
      );

      const unsubscribe = observers.map((observer) =>
        observer.subscribe(() => {}),
      );

      const { result } = renderHook(() => useTimersCache(), { wrapper });

      act(() => {
        if (operation === "upsert") result.current.upsertTimer(timer);
        else result.current.removeTimer(timer);
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(globalKey)).toEqual(["fresh"]);
        expect(queryClient.getQueryData(detailKey)).toEqual(["fresh"]);
      });
      expect(fetchHistory).toHaveBeenCalledTimes(2);
      expect(queryClient.getQueryData(closedKey)).toEqual(["old"]);
      expect(queryClient.getQueryState(closedKey)?.isInvalidated).toBe(true);

      for (const key of unrelatedKeys)
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);

      for (const off of unsubscribe) off();
    },
  );

  it("does not update or remove another Organization's timer with the same key", () => {
    const timer = createTimer();
    const otherOrganizationTimer = createTimer({ guildId: "guild-2" });
    const key = queryKeys.timers(timer.world);
    queryClient.setQueryData(key, [timer, otherOrganizationTimer]);

    const { result } = renderHook(() => useTimersCache(), { wrapper });
    const updated = { ...timer, updatedAt: "2026-04-22T10:01:00.000Z" };
    result.current.upsertTimer(updated);
    expect(queryClient.getQueryData(key)).toEqual([
      { ...updated, isPending: false },
      otherOrganizationTimer,
    ]);

    result.current.removeTimer(timer);
    expect(queryClient.getQueryData(key)).toEqual([otherOrganizationTimer]);
  });

  it("prevents an older in-flight history from offering restore after the timer becomes active", async () => {
    const history = createTimerHistoryFixture();
    const oldSnapshot = Promise.withResolvers<(typeof history)[]>();
    const fresh = [{ ...history, canRestore: false }];

    const queryKey = getTimersControllerGetRecentTimerHistoryQueryKey({
      guildId: history.guildId,
      world: history.world,
      limit: 10,
    });

    const fetchHistory = vi
      .fn<() => Promise<(typeof history)[]>>()
      .mockReturnValueOnce(oldSnapshot.promise)
      .mockResolvedValue(fresh);

    const observer = new QueryObserver(queryClient, {
      queryKey,
      queryFn: fetchHistory,
      staleTime: 30_000,
    });

    const unsubscribe = observer.subscribe(() => {});
    const { result } = renderHook(() => useTimersCache(), { wrapper });

    act(() => {
      result.current.upsertTimer(createTimer({ timerKey: history.timerKey }));
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKey)).toEqual(fresh),
    );
    await act(async () => {
      oldSnapshot.resolve([history]);
      await oldSnapshot.promise;
    });
    expect(queryClient.getQueryData(queryKey)).toEqual(fresh);
    unsubscribe();
  });

  it.each(["upsert", "remove"] as const)(
    "reconciles an in-flight snapshot without undoing a socket %s",
    async (operation) => {
      const timer = createTimer();
      const oldSnapshot = Promise.withResolvers<Timer[]>();

      const fresh =
        operation === "upsert" ? [{ ...timer, isPending: false }] : [];

      const queryKey = queryKeys.timers(timer.world);
      queryClient.setQueryData(queryKey, operation === "upsert" ? [] : [timer]);

      const fetchTimers = vi
        .fn<() => Promise<Timer[]>>()
        .mockReturnValueOnce(oldSnapshot.promise)
        .mockResolvedValue(fresh);

      const observer = new QueryObserver(queryClient, {
        queryKey,
        queryFn: fetchTimers,
      });

      const unsubscribe = observer.subscribe(() => {});
      const { result } = renderHook(() => useTimersCache(), { wrapper });

      act(() => {
        if (operation === "upsert") result.current.upsertTimer(timer);
        else result.current.removeTimer(timer);
      });
      await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
      await act(async () => {
        oldSnapshot.resolve(operation === "upsert" ? [] : [timer]);
        await oldSnapshot.promise;
      });
      expect(queryClient.getQueryData(queryKey)).toEqual(fresh);
      unsubscribe();
    },
  );
});
