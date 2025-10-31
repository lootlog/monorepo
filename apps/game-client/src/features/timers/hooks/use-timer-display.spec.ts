import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Timer } from "@/hooks/api/use-timers";
import { NpcType } from "@/hooks/api/use-npcs";
import { useTimerDisplay } from "./use-timer-display";

vi.mock("@/store/timers.store", () => ({
  useTimersStore: () => ({
    timersColors: { "Dragon Boss": "red" },
    customColors: {},
    overriddenDefaultColors: {},
    displayConfig: {
      showType: true,
      showLevel: true,
      fontSize: 12,
      singleTimerDisplayMode: "row",
    },
    generalConfig: {
      countdownMode: "min",
    },
  }),
}));

vi.mock("@/constants/margonem", () => ({
  NPC_NAMES: {
    HERO: { shortname: "B" },
    ELITE: { shortname: "E" },
    ELITE2: { shortname: "E2" },
    ELITE3: { shortname: "E3" },
    TITAN: { shortname: "T" },
    COLOSSUS: { shortname: "C" },
  },
}));

import { createMockTimer } from "../__tests__/test-helpers";

describe("useTimerDisplay", () => {
  const mockTimer = createMockTimer();

  it("should calculate isPending correctly", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.isPending).toBe(false);
  });

  it("should calculate isPending as true when timer is pending", () => {
    const pendingTimer = createMockTimer({ isPending: true });
    const { result } = renderHook(() =>
      useTimerDisplay(pendingTimer, 1000, 2000),
    );

    expect(result.current.isPending).toBe(true);
  });

  it("should calculate isMinSpawnTime correctly", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, -100, 2000));

    expect(result.current.isMinSpawnTime).toBe(true);
  });

  it("should calculate hasPassedRedThreshold correctly", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, -100, -50));

    expect(result.current.hasPassedRedThreshold).toBe(true);
  });

  it("should return selected color", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.selectedColor).toBe("red");
  });

  it("should include reset indicator when timer was reset", () => {
    const resetTimer = createMockTimer({ wasReset: true });
    const { result } = renderHook(() =>
      useTimerDisplay(resetTimer, 1000, 2000),
    );

    expect(result.current.resetIndicator).toBe("[R] ");
  });

  it("should not include reset indicator when timer was not reset", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.resetIndicator).toBe("");
  });

  it("should include shortname when showType is true", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.shortname).toBe("[B]");
  });

  it("should include NPC details when showLevel is true and level > 0", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.npcDetails).toBe(" (100w)");
  });

  it("should not include NPC details when level is 0", () => {
    const timerLvl0 = createMockTimer({
      npc: {
        id: 1,
        name: "Dragon Boss",
        type: NpcType.HERO,
        lvl: 0,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
    });
    const { result } = renderHook(() => useTimerDisplay(timerLvl0, 1000, 2000));

    expect(result.current.npcDetails).toBe("");
  });

  it("should calculate timeLeft based on countdown mode min", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.timeLeft).toBe(1000);
  });

  it("should return maxTimeLeft when isMinSpawnTime is true", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, -100, 2000));

    expect(result.current.timeLeft).toBe(2000);
  });

  it("should return display config", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.displayConfig).toBeDefined();
    expect(result.current.displayConfig.fontSize).toBe(12);
  });

  it("should return customColor and overriddenColor as undefined for default color", () => {
    const { result } = renderHook(() => useTimerDisplay(mockTimer, 1000, 2000));

    expect(result.current.customColor).toBeUndefined();
    expect(result.current.overriddenColor).toBeUndefined();
  });
});
