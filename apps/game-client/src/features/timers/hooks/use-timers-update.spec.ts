import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { NpcType } from "@/hooks/api/use-npcs";
import { useTimersUpdate } from "./use-timers-update";
import { createMockTimerWithTimeLeft } from "../__tests__/test-helpers";

describe("useTimersUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with active timers", () => {
    const activeTimers: TimerWithTimeLeft[] = [
      createMockTimerWithTimeLeft({
        npc: {
          id: 1,
          name: "Boss1",
          type: NpcType.HERO,
          lvl: 100,
          prof: "warrior",
          icon: "icon.png",
          wt: 1,
          margonemType: 1,
        },
        maxTimeLeft: 10000,
        minTimeLeft: 5000,
      }),
    ];

    const { result } = renderHook(() => useTimersUpdate(activeTimers, 60000));

    expect(result.current.length).toBe(1);
    expect(result.current[0].npc.name).toBe("Boss1");
  });

  it("should update calculated timers when activeTimers change", () => {
    const initialTimers: TimerWithTimeLeft[] = [
      createMockTimerWithTimeLeft({
        npc: {
          id: 1,
          name: "Boss1",
          type: NpcType.HERO,
          lvl: 100,
          prof: "warrior",
          icon: "icon.png",
          wt: 1,
          margonemType: 1,
        },
        maxTimeLeft: 10000,
        minTimeLeft: 5000,
      }),
    ];

    const { result, rerender } = renderHook(
      ({ timers }) => useTimersUpdate(timers, 60000),
      { initialProps: { timers: initialTimers } },
    );

    const newTimers: TimerWithTimeLeft[] = [
      createMockTimerWithTimeLeft({
        npcId: 2,
        npc: {
          id: 2,
          name: "Boss2",
          type: NpcType.HERO,
          lvl: 100,
          prof: "warrior",
          icon: "icon.png",
          wt: 1,
          margonemType: 1,
        },
        maxTimeLeft: 20000,
        minTimeLeft: 10000,
      }),
    ];

    rerender({ timers: newTimers });

    expect(result.current.length).toBe(1);
    expect(result.current[0].npc.name).toBe("Boss2");
  });

  it("should update timers every second", async () => {
    const now = Date.now();
    const activeTimers: TimerWithTimeLeft[] = [
      createMockTimerWithTimeLeft({
        npc: {
          id: 1,
          name: "Boss1",
          type: NpcType.HERO,
          lvl: 100,
          prof: "warrior",
          icon: "icon.png",
          wt: 1,
          margonemType: 1,
        },
        maxSpawnTime: new Date(now + 10000),
        minSpawnTime: new Date(now + 5000),
        maxTimeLeft: 10000,
        minTimeLeft: 5000,
      }),
    ];

    const { result } = renderHook(() => useTimersUpdate(activeTimers, 60000));

    const initialMaxTimeLeft = result.current[0].maxTimeLeft;

    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(result.current[0].maxTimeLeft).toBeLessThan(initialMaxTimeLeft);
    });
  });

  it("should filter out timers past removal time", async () => {
    const now = Date.now();
    const activeTimers: TimerWithTimeLeft[] = [
      createMockTimerWithTimeLeft({
        npc: {
          id: 1,
          name: "Boss1",
          type: NpcType.HERO,
          lvl: 100,
          prof: "warrior",
          icon: "icon.png",
          wt: 1,
          margonemType: 1,
        },
        maxSpawnTime: new Date(now - 100000),
        minSpawnTime: new Date(now - 110000),
        maxTimeLeft: -100000,
        minTimeLeft: -110000,
      }),
    ];

    const { result } = renderHook(() => useTimersUpdate(activeTimers, 60000));

    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(result.current.length).toBe(0);
    });
  });
});
