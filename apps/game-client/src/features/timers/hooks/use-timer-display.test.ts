import { normalizeTimerResponse, type Timer } from "@/api/timers.api";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import {
  fixtureValue,
  nestedFixtureValue,
  optionalFixtureValue,
} from "@/test-utils/fixture-value";
import { createTimersWindowModelFixture } from "@/features/timers/model/timers-window-model-fixture";
import { useTimerDisplay } from "./use-timer-display";

const appearance = createTimersWindowModelFixture({
  appearance: {
    countdownMode: "min",
    displayConfig: { showLevel: true },
    colors: {
      timersColors: { Tanroth: "custom-red", Mushita: "white" },
      customColors: {
        "custom-red": {
          id: "custom-red",
          name: "Custom red",
          borderColor: "#f00",
          backgroundColor: "#fee",
        },
      },
      overriddenDefaultColors: {
        white: { borderColor: "#111", backgroundColor: "#333" },
      },
    },
  },
}).appearance;

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: "2026-04-22T10:00:00.000Z",
  maxSpawnTime: "2026-04-22T10:05:00.000Z",
  updatedAt: "2026-04-22T09:59:00.000Z",
  wasReset: fixtureValue(overrides, "wasReset", false),
  npc: {
    id: nestedFixtureValue(overrides, "npc", "id", 10),
    name: nestedFixtureValue(overrides, "npc", "name", "Tanroth"),
    lvl: nestedFixtureValue(overrides, "npc", "lvl", 120),
    prof: nestedFixtureValue(overrides, "npc", "prof", "W"),
    icon: nestedFixtureValue(overrides, "npc", "icon", "icon.gif"),
    wt: nestedFixtureValue(overrides, "npc", "wt", 10),
    type: nestedFixtureValue(overrides, "npc", "type", NpcType.HERO),
    margonemType: nestedFixtureValue(overrides, "npc", "margonemType", 4),
    location: nestedFixtureValue(overrides, "npc", "location", "Ruins"),
  },
  member: optionalFixtureValue(overrides, "member"),
  members: optionalFixtureValue(overrides, "members"),
  isCustomTime: fixtureValue(overrides, "isCustomTime", false),
  isPending: fixtureValue(overrides, "isPending", false),
  ...overrides,
});

describe("useTimerDisplay", () => {
  it("builds display data for a regular timer with a custom color", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(createTimer({ wasReset: true }), appearance),
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
        appearance,
      ),
    );

    expect(result.current.shortname).toBe("[M][E2]");
  });

  it("shows only the manual indicator for manual timers without a known NPC type", () => {
    const { result } = renderHook(() =>
      useTimerDisplay(
        normalizeTimerResponse({
          ...createTimer(),
          member: undefined,
          npc: {
            ...createTimer().npc,
            type: NpcType.NPC,
            margonemType: "999",
            wt: "10",
            location: "Ruins",
          },
        }),
        appearance,
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
        appearance,
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
        appearance,
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
});
