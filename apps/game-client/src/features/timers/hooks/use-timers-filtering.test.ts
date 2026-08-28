import { describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimersFiltering } from "./use-timers-filtering";
import {
  fixtureValue,
  nestedFixtureValue,
  optionalFixtureValue,
} from "@/test-utils/fixture-value";

const createTimer = (
  overrides?: Partial<TimerWithTimeLeft>,
): TimerWithTimeLeft => ({
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
    type: nestedFixtureValue(overrides, "npc", "type", NpcType.HERO),
    margonemType: nestedFixtureValue(overrides, "npc", "margonemType", 4),
    location: nestedFixtureValue(overrides, "npc", "location", "Ruins"),
  },
  minTimeLeft: fixtureValue(overrides, "minTimeLeft", 60_000),
  maxTimeLeft: fixtureValue(overrides, "maxTimeLeft", 120_000),
  members: optionalFixtureValue(overrides, "members"),
  mergedGuildIds: optionalFixtureValue(overrides, "mergedGuildIds"),
});

describe("useTimersFiltering", () => {
  it("applies guild, visibility, search, npc type, level, and color filters before sorting", () => {
    const filtered = useTimersFiltering({
      calculatedTimers: [
        createTimer({
          guildId: "guild-1",
          timerKey: "pinned",
          npc: {
            ...createTimer().npc,
            name: "Tanroth",
            lvl: 120,
            type: NpcType.HERO,
          },
          maxSpawnTime: "2026-04-22T10:03:00.000Z",
        }),
        createTimer({
          guildId: "guild-1",
          timerKey: "hidden",
          npc: {
            ...createTimer().npc,
            name: "Mushita",
            lvl: 80,
            type: NpcType.ELITE2,
          },
          maxSpawnTime: "2026-04-22T10:02:00.000Z",
        }),
        createTimer({
          guildId: "guild-2",
          timerKey: "other-guild",
          npc: {
            ...createTimer().npc,
            name: "Raróg",
          },
        }),
      ],
      isGrouping: false,
      guildId: "guild-1",
      hiddenTimers: ["Mushita"],
      showHiddenTimers: false,
      searchText: "tan",
      selectedNpcTypes: [NpcType.HERO],
      minLvl: 100,
      maxLvl: 130,
      selectedColors: ["red"],
      colorFiltersEnabled: true,
      timersColors: {
        Tanroth: "red",
        Mushita: "blue",
      },
      pinnedTimers: ["Tanroth"],
      sortOrder: "asc",
      removeTimerAfterMs: 30_000,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.npc.name).toBe("Tanroth");
  });

  it("skips guild filtering while grouped and disables color filtering when the toggle is off", () => {
    const filtered = useTimersFiltering({
      calculatedTimers: [
        createTimer({
          guildId: "guild-1",
          timerKey: "timer-a",
          npc: {
            ...createTimer().npc,
            name: "Tanroth",
          },
          maxSpawnTime: "2026-04-22T10:01:00.000Z",
        }),
        createTimer({
          guildId: "guild-2",
          timerKey: "timer-b",
          npc: {
            ...createTimer().npc,
            name: "Mushita",
            type: NpcType.HERO,
          },
          maxSpawnTime: "2026-04-22T10:03:00.000Z",
        }),
      ],
      isGrouping: true,
      guildId: "guild-1",
      hiddenTimers: [],
      showHiddenTimers: true,
      searchText: "",
      selectedNpcTypes: [NpcType.HERO],
      minLvl: 0,
      maxLvl: 300,
      selectedColors: ["red"],
      colorFiltersEnabled: false,
      timersColors: {
        Tanroth: "red",
        Mushita: "blue",
      },
      pinnedTimers: [],
      sortOrder: "desc",
      removeTimerAfterMs: 30_000,
    });

    expect(filtered.map((timer) => timer.npc.name)).toEqual([
      "Mushita",
      "Tanroth",
    ]);
  });

  it("keeps slightly expired timers in regular sorting until the removal timeout passes", () => {
    const filtered = useTimersFiltering({
      calculatedTimers: [
        createTimer({
          timerKey: "expired-before-threshold",
          npc: {
            ...createTimer().npc,
            name: "Expired before threshold",
          },
          maxSpawnTime: "2026-04-22T10:00:00.000Z",
          maxTimeLeft: -10_000,
        }),
        createTimer({
          timerKey: "expired-after-threshold",
          npc: {
            ...createTimer().npc,
            name: "Expired after threshold",
          },
          maxSpawnTime: "2026-04-22T10:01:00.000Z",
          maxTimeLeft: -40_000,
        }),
        createTimer({
          timerKey: "active",
          npc: {
            ...createTimer().npc,
            name: "Active",
          },
          maxSpawnTime: "2026-04-22T10:02:00.000Z",
          maxTimeLeft: 120_000,
        }),
      ],
      isGrouping: true,
      guildId: "guild-1",
      hiddenTimers: [],
      showHiddenTimers: true,
      searchText: "",
      selectedNpcTypes: [NpcType.HERO],
      minLvl: 0,
      maxLvl: 300,
      selectedColors: [],
      colorFiltersEnabled: false,
      timersColors: {},
      pinnedTimers: [],
      sortOrder: "asc",
      expiredTimersAtBottom: true,
      removeTimerAfterMs: 30_000,
    });

    expect(filtered.map((timer) => timer.npc.name)).toEqual([
      "Expired before threshold",
      "Active",
      "Expired after threshold",
    ]);
  });
});
