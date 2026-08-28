import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersCache } from "./use-timers-cache";
import {
  fixtureValue,
  nestedFixtureValue,
  optionalFixtureValue,
} from "@/test-utils/fixture-value";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: fixtureValue(overrides, "guildId", "guild-1"),
  timerKey: fixtureValue(overrides, "timerKey", "timer-1"),
  world: fixtureValue(overrides, "world", "pandora"),
  npcId: fixtureValue(overrides, "npcId", 10),
  minSpawnTime: fixtureValue(
    overrides,
    "minSpawnTime",
    "2026-04-22T10:00:00.000Z",
  ),
  maxSpawnTime: fixtureValue(
    overrides,
    "maxSpawnTime",
    "2026-04-22T10:05:00.000Z",
  ),
  updatedAt: fixtureValue(overrides, "updatedAt", "2026-04-22T09:59:00.000Z"),
  wasReset: fixtureValue(overrides, "wasReset", false),
  npc: {
    id: nestedFixtureValue(overrides, "npc", "id", 10),
    name: nestedFixtureValue(overrides, "npc", "name", "Tanroth"),
    lvl: nestedFixtureValue(overrides, "npc", "lvl", 120),
    prof: nestedFixtureValue(overrides, "npc", "prof", "W"),
    icon: nestedFixtureValue(overrides, "npc", "icon", "icon.gif"),
    wt: nestedFixtureValue(overrides, "npc", "wt", 10),
    type: nestedFixtureValue(overrides, "npc", "type", "hero"),
    margonemType: nestedFixtureValue(overrides, "npc", "margonemType", 4),
    location: nestedFixtureValue(overrides, "npc", "location", "Ruins"),
  } as never,
  member: optionalFixtureValue(overrides, "member"),
  members: optionalFixtureValue(overrides, "members"),
  isCustomTime: fixtureValue(overrides, "isCustomTime", false),
  isPending: fixtureValue(overrides, "isPending", false),
});

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
      .fn()
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
    const fetchTimers = vi.fn().mockResolvedValue(serverTimers);
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
      (queryClient.getQueryData(queryKeys.timers("pandora")) as Timer[]).map(
        (timer) => timer.timerKey,
      ),
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
