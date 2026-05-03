import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import { useTimersStore } from "@/store/timers.store";
import { useTimerDisplay } from "./use-timer-display";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: "2026-04-22T10:00:00.000Z",
  maxSpawnTime: "2026-04-22T10:05:00.000Z",
  updatedAt: "2026-04-22T09:59:00.000Z",
  wasReset: overrides?.wasReset ?? false,
  npc: {
    id: overrides?.npc?.id ?? 10,
    name: overrides?.npc?.name ?? "Tanroth",
    lvl: overrides?.npc?.lvl ?? 120,
    prof: overrides?.npc?.prof ?? "W",
    icon: overrides?.npc?.icon ?? "icon.gif",
    wt: overrides?.npc?.wt ?? 10,
    type: overrides?.npc?.type ?? NpcType.HERO,
    margonemType: overrides?.npc?.margonemType ?? 4,
    location: overrides?.npc?.location ?? "Ruins",
  },
  member: overrides?.member,
  members: overrides?.members,
  isCustomTime: overrides?.isCustomTime ?? false,
  isPending: overrides?.isPending ?? false,
  ...overrides,
});

describe("useTimerDisplay", () => {
  beforeEach(() => {
    useTimersStore.setState({
      timersColors: {
        Tanroth: "custom-red",
        Mushita: "white",
      },
      customColors: {
        "custom-red": {
          id: "custom-red",
          name: "Custom red",
          borderColor: "#f00",
          backgroundColor: "#fee",
        },
      },
      overriddenDefaultColors: {
        white: {
          borderColor: "#111",
          backgroundColor: "#333",
        },
      },
      displayConfig: {
        showType: true,
        showLevel: true,
        fontSize: 11,
        minColumnWidth: 120,
        singleTimerDisplayMode: "row",
      },
      generalConfig: {
        removeTimerAfterMs: 30_000,
        timersGrouping: false,
        timersUnderBag: false,
        countdownMode: "min",
        compactView: false,
      },
    });
  });

  it("builds display data for a regular timer with a custom color", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(createTimer({ wasReset: true }), 5_000, 15_000),
    );

    expect(result.current).toMatchObject({
      isPending: false,
      isMinSpawnTime: false,
      hasPassedRedThreshold: false,
      selectedColor: "custom-red",
      customColor: {
        id: "custom-red",
        name: "Custom red",
        borderColor: "#f00",
        backgroundColor: "#fee",
      },
      overriddenColor: undefined,
      resetIndicator: "[R] ",
      npcDetails: " (120w)",
      timeLeft: 5_000,
    });
    expect(result.current.shortname).toMatch(/^\[.*\]$/);
  });

  it("shows manual and NPC type indicators for manual typed timers", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(
        createTimer({
          npc: {
            ...createTimer().npc,
            type: NpcType.ELITE2,
            margonemType: 999,
          },
        }),
        5_000,
        15_000,
      ),
    );

    expect(result.current.shortname).toBe("[M][E2]");
  });

  it("shows only the manual indicator for manual timers without a known NPC type", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(
        createTimer({
          npc: {
            ...createTimer().npc,
            type: NpcType.NPC,
            margonemType: "999" as never,
          },
        }),
        5_000,
        15_000,
      ),
    );

    expect(result.current.shortname).toBe("[M]");
  });

  it("keeps regular typed timer indicators unchanged", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(
        createTimer({
          npc: {
            ...createTimer().npc,
            type: NpcType.ELITE2,
          },
        }),
        5_000,
        15_000,
      ),
    );

    expect(result.current.shortname).toBe("[E2]");
  });

  it("falls back to the max countdown when the min spawn time already passed and resolves overridden colors", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(
        createTimer({
          npc: {
            ...createTimer().npc,
            name: "Mushita",
          },
          isPending: true,
        }),
        -1_000,
        -100,
      ),
    );

    expect(result.current).toMatchObject({
      isPending: true,
      isMinSpawnTime: true,
      hasPassedRedThreshold: true,
      selectedColor: "white",
      customColor: undefined,
      overriddenColor: {
        borderColor: "#111",
        backgroundColor: "#333",
      },
      timeLeft: -100,
    });
  });
});
