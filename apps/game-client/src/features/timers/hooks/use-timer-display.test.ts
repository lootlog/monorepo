import { act, renderHook } from "@testing-library/react";
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
      useTimerDisplay(createTimer({ wasReset: true })),
    );

    expect(result.current).toMatchObject({
      isPending: false,
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
      countdownMode: "min",
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
      ),
    );

    expect(result.current.shortname).toBe("[E2]");
  });

  it("resolves pending state and overridden colors without clock data", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(
        createTimer({
          npc: {
            ...createTimer().npc,
            name: "Mushita",
          },
          isPending: true,
        }),
      ),
    );

    expect(result.current).toMatchObject({
      isPending: true,
      selectedColor: "white",
      customColor: undefined,
      overriddenColor: {
        borderColor: "#111",
        backgroundColor: "#333",
      },
      countdownMode: "min",
    });
  });

  it("does not rerender a timer when an unrelated timer setting changes", () => {
    let renderCount = 0;

    renderHook(() => {
      renderCount += 1;
      return useTimerDisplay(createTimer());
    });

    act(() => {
      useTimersStore.setState({ timerFiltersSearchText: "unrelated" });
    });

    expect(renderCount).toBe(1);
  });
});
