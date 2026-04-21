import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Timer } from "@/api/timers.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersCache } from "./use-timers-cache";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  id: "timer-1",
  guildId: overrides?.guildId ?? "guild-1",
  timerKey: overrides?.timerKey ?? "timer-1",
  world: overrides?.world ?? "pandora",
  npcId: overrides?.npcId ?? 10,
  minSpawnTime: overrides?.minSpawnTime ?? "2026-04-22T10:00:00.000Z",
  maxSpawnTime: overrides?.maxSpawnTime ?? "2026-04-22T10:05:00.000Z",
  updatedAt: overrides?.updatedAt ?? "2026-04-22T09:59:00.000Z",
  wasReset: overrides?.wasReset ?? false,
  npc: {
    id: overrides?.npc?.id ?? 10,
    name: overrides?.npc?.name ?? "Tanroth",
    lvl: overrides?.npc?.lvl ?? 120,
    prof: overrides?.npc?.prof ?? "W",
    icon: overrides?.npc?.icon ?? "icon.gif",
    wt: overrides?.npc?.wt ?? 10,
    type: overrides?.npc?.type ?? "hero",
    margonemType: overrides?.npc?.margonemType ?? 4,
    location: overrides?.npc?.location ?? "Ruins",
  } as never,
  member: overrides?.member,
  members: overrides?.members,
  isCustomTime: overrides?.isCustomTime ?? false,
  isPending: overrides?.isPending ?? false,
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
});
