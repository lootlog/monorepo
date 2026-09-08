import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersCache } from "./use-timers-cache";
import { createTimerFixture as createTimer } from "@/features/timers/timer-fixtures";

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
      queryKey: queryKeys.timers("pandora"),
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
      world: "pandora",
      guildId: "guild-1",
      timerKey: "socket-timer",
    });

    const timers = await queryClient.fetchQuery({
      queryKey: queryKeys.timers("pandora"),
      queryFn: fetchTimers,
      staleTime: 30_000,
    });

    expect(fetchTimers).toHaveBeenCalledOnce();
    expect(timers).toEqual(serverTimers);
  });

  it("upserts timers by identity and clears their pending flag", () => {
    queryClient.setQueryData(queryKeys.timers("pandora"), [
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

    expect(queryClient.getQueryData(queryKeys.timers("pandora"))).toEqual([
      expect.objectContaining({
        updatedAt: "2026-04-22T10:01:00.000Z",
        isPending: false,
      }),
    ]);
  });

  it("appends new timers and removes them by world, guild, and key", () => {
    queryClient.setQueryData(queryKeys.timers("pandora"), [
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
      world: "pandora",
      guildId: "guild-1",
      timerKey: "timer-2",
    });

    expect(
      (
        queryClient.getQueryData<Timer[]>(queryKeys.timers("pandora")) ?? []
      ).map((timer) => timer.timerKey),
    ).toEqual(["timer-1", "timer-3"]);
  });

  it("does not refetch the full timers query after an authoritative socket delete", () => {
    queryClient.setQueryData(queryKeys.timers("pandora"), [
      createTimer({
        timerKey: "timer-1",
      }),
    ]);
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useTimersCache(), { wrapper });

    result.current.removeTimer({
      world: "pandora",
      guildId: "guild-1",
      timerKey: "timer-1",
    });

    expect(queryClient.getQueryData(queryKeys.timers("pandora"))).toEqual([]);
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
