import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { NpcType } from "@/hooks/api/use-npcs";
import { useTimersFiltering } from "./use-timers-filtering";
import { createMockTimerWithTimeLeft } from "../__tests__/test-helpers";

describe("useTimersFiltering", () => {
  const baseTimers: TimerWithTimeLeft[] = [
    createMockTimerWithTimeLeft({
      npc: {
        id: 1,
        name: "Dragon Boss",
        type: NpcType.HERO,
        lvl: 100,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
      guildId: "guild1",
      maxSpawnTime: new Date("2024-01-01T10:00:00Z"),
    }),
    createMockTimerWithTimeLeft({
      npcId: 2,
      npc: {
        id: 2,
        name: "Orc Elite",
        type: NpcType.ELITE,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
      guildId: "guild2",
      maxSpawnTime: new Date("2024-01-01T11:00:00Z"),
    }),
    createMockTimerWithTimeLeft({
      npcId: 3,
      npc: {
        id: 3,
        name: "Dark Dragon",
        type: NpcType.HERO,
        lvl: 150,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
      guildId: "guild1",
      maxSpawnTime: new Date("2024-01-01T12:00:00Z"),
    }),
  ];

  const defaultProps = {
    calculatedTimers: baseTimers,
    isGrouping: false,
    guildId: "guild1",
    hiddenTimers: [],
    showHiddenTimers: false,
    searchText: "",
    selectedNpcTypes: [NpcType.HERO, NpcType.ELITE, NpcType.TITAN],
    minLvl: 1,
    maxLvl: 500,
    selectedColors: [],
    colorFiltersEnabled: false,
    timersColors: {},
    pinnedTimers: [],
    sortOrder: "asc" as const,
  };

  it("should filter by guild when not grouping", () => {
    const { result } = renderHook(() => useTimersFiltering(defaultProps));

    expect(result.current.length).toBe(2);
    expect(result.current.every((t) => t.guildId === "guild1")).toBe(true);
  });

  it("should not filter by guild when grouping", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
      }),
    );

    expect(result.current.length).toBe(3);
  });

  it("should filter by search text", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        searchText: "dragon",
      }),
    );

    expect(result.current.length).toBe(2);
    expect(
      result.current.every((t) => t.npc.name.toLowerCase().includes("dragon")),
    ).toBe(true);
  });

  it("should filter by NPC type", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        selectedNpcTypes: [NpcType.HERO],
      }),
    );

    expect(result.current.length).toBe(2);
    expect(result.current.every((t) => t.npc.name.includes("Dragon"))).toBe(
      true,
    );
  });

  it("should filter by level range", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        minLvl: 50,
        maxLvl: 100,
      }),
    );

    expect(result.current.length).toBe(2);
    expect(
      result.current.every((t) => t.npc.lvl >= 50 && t.npc.lvl <= 100),
    ).toBe(true);
  });

  it("should filter by color", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        colorFiltersEnabled: true,
        selectedColors: ["red"],
        timersColors: {
          "Dragon Boss": "red",
          "Orc Elite": "blue",
        },
      }),
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].npc.name).toBe("Dragon Boss");
  });

  it("should hide hidden timers when showHiddenTimers is false", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        hiddenTimers: ["Dragon Boss"],
        showHiddenTimers: false,
      }),
    );

    expect(result.current.length).toBe(2);
    expect(result.current.every((t) => t.npc.name !== "Dragon Boss")).toBe(
      true,
    );
  });

  it("should show hidden timers when showHiddenTimers is true", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        hiddenTimers: ["Dragon Boss"],
        showHiddenTimers: true,
      }),
    );

    expect(result.current.length).toBe(3);
  });

  it("should sort pinned timers first", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        pinnedTimers: ["Dark Dragon"],
      }),
    );

    expect(result.current[0].npc.name).toBe("Dark Dragon");
  });

  it("should sort by time ascending", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        sortOrder: "asc",
      }),
    );

    expect(result.current[0].npc.name).toBe("Dragon Boss");
    expect(result.current[result.current.length - 1].npc.name).toBe(
      "Dark Dragon",
    );
  });

  it("should sort by time descending", () => {
    const { result } = renderHook(() =>
      useTimersFiltering({
        ...defaultProps,
        isGrouping: true,
        sortOrder: "desc",
      }),
    );

    expect(result.current[0].npc.name).toBe("Dark Dragon");
    expect(result.current[result.current.length - 1].npc.name).toBe(
      "Dragon Boss",
    );
  });
});
