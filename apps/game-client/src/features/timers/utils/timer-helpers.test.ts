import { beforeEach, describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import { useTimersStore } from "@/store/timers.store";
import {
  calculateTimeLeft,
  getLevelSuffix,
  getMembersWithGuilds,
  getTimerColorConfig,
  getTimerMembers,
} from "./timer-helpers";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: "2026-04-22T10:00:00.000Z",
  maxSpawnTime: "2026-04-22T10:05:00.000Z",
  updatedAt: "2026-04-22T09:55:00.000Z",
  wasReset: false,
  npc: {
    id: 10,
    name: "Tanroth",
    lvl: 120,
    prof: "W",
    icon: "icon.gif",
    wt: 10,
    type: NpcType.HERO,
    margonemType: 4,
    location: "Ruins",
  },
  member: overrides?.member,
  members: overrides?.members,
  ...overrides,
});

describe("timer-helpers", () => {
  beforeEach(() => {
    useTimersStore.setState({
      timersColors: {},
      customColors: {},
      overriddenDefaultColors: {},
      displayConfig: {
        showType: true,
        showLevel: false,
        fontSize: 11,
        minColumnWidth: 120,
        singleTimerDisplayMode: "row",
      },
      generalConfig: {
        removeTimerAfterMs: 30_000,
        timersGrouping: false,
        timersUnderBag: false,
        countdownMode: "max",
        compactView: false,
      },
    });
  });

  it("formats level suffixes and supports level-zero timers", () => {
    expect(getLevelSuffix(createTimer().npc)).toBe(" (120w)");
    expect(
      getLevelSuffix({
        ...createTimer().npc,
        lvl: 0,
      }),
    ).toBe("");
  });

  it("prefers merged members over a single member and deduplicates guild labels", () => {
    const singleMember = {
      id: 1,
      userId: "user-1",
      guildId: "guild-1",
      type: "member",
      name: "Alice",
    };
    const timer = createTimer({
      member: singleMember,
      members: [
        singleMember,
        {
          id: 1,
          userId: "user-1",
          guildId: "guild-1",
          type: "member",
          name: "Alice",
        },
        {
          id: 2,
          userId: "user-2",
          guildId: "guild-2",
          type: "member",
          name: "Bob",
        },
      ],
    });

    expect(getTimerMembers(timer)).toHaveLength(3);
    expect(
      getMembersWithGuilds(getTimerMembers(timer), {
        "guild-1": "Alpha",
        "guild-2": "Beta",
      }),
    ).toEqual([
      { id: 1, memberLabel: "Alice (Alpha)", characterLabel: undefined },
      { id: 2, memberLabel: "Bob (Beta)", characterLabel: undefined },
    ]);
  });

  it("chooses the correct countdown based on mode and min-spawn state", () => {
    expect(calculateTimeLeft(5_000, 10_000, "max", false)).toBe(10_000);
    expect(calculateTimeLeft(5_000, 10_000, "min", false)).toBe(5_000);
    expect(calculateTimeLeft(-1, 10_000, "min", true)).toBe(10_000);
  });

  it("resolves selected default, custom, and overridden colors", () => {
    expect(
      getTimerColorConfig(
        "Tanroth",
        {
          Tanroth: "white",
        },
        {},
        {
          white: {
            backgroundColor: "#111",
            borderColor: "#222",
          },
        },
      ),
    ).toEqual({
      selectedColor: "white",
      customColor: undefined,
      overriddenColor: {
        backgroundColor: "#111",
        borderColor: "#222",
      },
    });

    expect(
      getTimerColorConfig(
        "Mushita",
        {
          Mushita: "custom-red",
        },
        {
          "custom-red": {
            id: "custom-red",
            name: "Custom Red",
            backgroundColor: "#faa",
            borderColor: "#f00",
          },
        },
        {},
      ),
    ).toEqual({
      selectedColor: "custom-red",
      customColor: {
        id: "custom-red",
        name: "Custom Red",
        backgroundColor: "#faa",
        borderColor: "#f00",
      },
      overriddenColor: undefined,
    });
  });
});
