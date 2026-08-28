import { afterEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import {
  fixtureValue,
  nestedFixtureValue,
  optionalFixtureValue,
} from "@/test-utils/fixture-value";
import type { Timer } from "@/api/timers.api";
import {
  calculateTimeLeft,
  filterTimersByColor,
  filterTimersByGuild,
  filterTimersByLevel,
  filterTimersByNpcType,
  filterTimersByExpiredVisibility,
  filterTimersByRemovalTime,
  filterTimersBySearchText,
  filterTimersByVisibility,
  mergeTimers,
  sortTimersByPinnedAndTime,
  type TimerWithTimeLeft,
} from "./timers-utils";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: fixtureValue(overrides, "guildId", "guild-1"),
  timerKey: fixtureValue(overrides, "timerKey", "timer-1"),
  world: fixtureValue(overrides, "world", "pandora"),
  npcId: fixtureValue(overrides, "npcId", 101),
  minSpawnTime: fixtureValue(
    overrides,
    "minSpawnTime",
    "2026-04-22T10:05:00.000Z",
  ),
  maxSpawnTime: fixtureValue(
    overrides,
    "maxSpawnTime",
    "2026-04-22T10:10:00.000Z",
  ),
  updatedAt: fixtureValue(overrides, "updatedAt", "2026-04-22T10:00:00.000Z"),
  deletedAt: optionalFixtureValue(overrides, "deletedAt"),
  wasReset: fixtureValue(overrides, "wasReset", false),
  npc: {
    id: nestedFixtureValue(overrides, "npc", "id", 101),
    name: nestedFixtureValue(overrides, "npc", "name", "Tanroth"),
    lvl: nestedFixtureValue(overrides, "npc", "lvl", 120),
    prof: nestedFixtureValue(overrides, "npc", "prof", "W"),
    icon: nestedFixtureValue(overrides, "npc", "icon", "icon.gif"),
    wt: nestedFixtureValue(overrides, "npc", "wt", 10),
    type: nestedFixtureValue(overrides, "npc", "type", NpcType.HERO),
    margonemType: nestedFixtureValue(overrides, "npc", "margonemType", 4),
    location: nestedFixtureValue(
      overrides,
      "npc",
      "location",
      "Kwieciste Przejście",
    ),
  },
  member: optionalFixtureValue(overrides, "member"),
  members: optionalFixtureValue(overrides, "members"),
  isCustomTime: fixtureValue(overrides, "isCustomTime", false),
  isPending: fixtureValue(overrides, "isPending", false),
});

const createTimerWithTimeLeft = (
  overrides?: Partial<TimerWithTimeLeft>,
): TimerWithTimeLeft => ({
  ...createTimer(overrides),
  minTimeLeft: fixtureValue(overrides, "minTimeLeft", 60_000),
  maxTimeLeft: fixtureValue(overrides, "maxTimeLeft", 120_000),
  members: optionalFixtureValue(overrides, "members"),
  mergedGuildIds: optionalFixtureValue(overrides, "mergedGuildIds"),
});

describe("timers-utils", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("merges timers by key and keeps the entry with the latest max spawn time", () => {
    const earlierTimer = createTimer({
      guildId: "guild-1",
      timerKey: "tanroth",
      maxSpawnTime: "2026-04-22T10:10:00.000Z",
      member: {
        id: 1,
        userId: "user-1",
        guildId: "guild-1",
        type: "member",
        name: "Alice",
      },
    });
    const laterTimer = createTimer({
      guildId: "guild-2",
      timerKey: "tanroth",
      maxSpawnTime: "2026-04-22T10:15:00.000Z",
      member: {
        id: 2,
        userId: "user-2",
        guildId: "guild-2",
        type: "member",
        name: "Bob",
      },
    });

    const merged = mergeTimers([earlierTimer, laterTimer]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      guildId: "guild-2",
      maxSpawnTime: "2026-04-22T10:15:00.000Z",
      members: [
        expect.objectContaining({ name: "Alice" }),
        expect.objectContaining({ name: "Bob" }),
      ],
      mergedGuildIds: [
        { guildId: "guild-1", npcId: 101, timerKey: "tanroth" },
        { guildId: "guild-2", npcId: 101, timerKey: "tanroth" },
      ],
    });
  });

  it("keeps manual timers separate per npc name and world", () => {
    const manualPandora = createTimer({
      timerKey: "manual-a",
      world: "pandora",
      npc: {
        ...createTimer().npc,
        name: "Manual timer",
        margonemType: 999,
      },
    });
    const manualGefion = createTimer({
      timerKey: "manual-b",
      world: "gefion",
      npc: {
        ...createTimer().npc,
        name: "Manual timer",
        margonemType: 999,
      },
    });

    expect(mergeTimers([manualPandora, manualGefion])).toHaveLength(2);
  });

  it("calculates time left against the current timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00.000Z"));

    const [timer] = calculateTimeLeft([
      createTimerWithTimeLeft({
        minSpawnTime: "2026-04-22T10:01:00.000Z",
        maxSpawnTime: "2026-04-22T10:02:30.000Z",
      }),
    ]);

    expect(timer.minTimeLeft).toBe(60_000);
    expect(timer.maxTimeLeft).toBe(150_000);
  });

  it("calculates time left from the epoch emitted by the visible timer clock", () => {
    const initialEpoch = new Date("2026-04-22T10:00:00.000Z").getTime();
    const sourceTimers = [
      createTimerWithTimeLeft({
        minSpawnTime: "2026-04-22T10:01:00.000Z",
        maxSpawnTime: "2026-04-22T10:02:30.000Z",
      }),
    ];

    const [initialTimer] = calculateTimeLeft(sourceTimers, initialEpoch);
    const [nextTimer] = calculateTimeLeft(sourceTimers, initialEpoch + 1_000);

    expect(nextTimer.minTimeLeft).toBe(initialTimer.minTimeLeft - 1_000);
    expect(nextTimer.maxTimeLeft).toBe(initialTimer.maxTimeLeft - 1_000);
  });

  it("calculates deleted timer time left from deletedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00.000Z"));

    const [timer] = calculateTimeLeft([
      createTimerWithTimeLeft({
        minSpawnTime: "2026-04-22T10:01:00.000Z",
        maxSpawnTime: "2026-04-22T10:02:30.000Z",
        deletedAt: "2026-04-22T09:59:30.000Z",
      }),
    ]);

    expect(timer.minTimeLeft).toBe(-30_000);
    expect(timer.maxTimeLeft).toBe(-30_000);
  });

  it("preserves the legacy timer pipeline for deleted, pinned, and expired timers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00.000Z"));

    const calculatedTimers = calculateTimeLeft([
      createTimerWithTimeLeft({
        timerKey: "active",
        minSpawnTime: "2026-04-22T10:01:00.000Z",
        maxSpawnTime: "2026-04-22T10:02:00.000Z",
        npc: { ...createTimer().npc, name: "Active" },
      }),
      createTimerWithTimeLeft({
        timerKey: "deleted",
        minSpawnTime: "2026-04-22T10:08:00.000Z",
        maxSpawnTime: "2026-04-22T10:09:00.000Z",
        deletedAt: "2026-04-22T09:59:30.000Z",
        npc: { ...createTimer().npc, name: "Deleted" },
      }),
      createTimerWithTimeLeft({
        timerKey: "expired",
        minSpawnTime: "2026-04-22T09:58:00.000Z",
        maxSpawnTime: "2026-04-22T09:59:00.000Z",
        npc: { ...createTimer().npc, name: "Expired" },
      }),
      createTimerWithTimeLeft({
        timerKey: "pinned",
        minSpawnTime: "2026-04-22T10:02:30.000Z",
        maxSpawnTime: "2026-04-22T10:03:00.000Z",
        npc: { ...createTimer().npc, name: "Pinned" },
      }),
    ]);

    expect(
      calculatedTimers.map((timer) => ({
        timerKey: timer.timerKey,
        minTimeLeft: timer.minTimeLeft,
        maxTimeLeft: timer.maxTimeLeft,
      })),
    ).toEqual([
      { timerKey: "active", minTimeLeft: 60_000, maxTimeLeft: 120_000 },
      { timerKey: "deleted", minTimeLeft: -30_000, maxTimeLeft: -30_000 },
      { timerKey: "expired", minTimeLeft: -120_000, maxTimeLeft: -60_000 },
      { timerKey: "pinned", minTimeLeft: 150_000, maxTimeLeft: 180_000 },
    ]);
    expect(
      sortTimersByPinnedAndTime(
        calculatedTimers,
        ["Pinned"],
        "asc",
        true,
        30_000,
      ).map((timer) => timer.timerKey),
    ).toEqual(["pinned", "active", "deleted", "expired"]);
    expect(
      sortTimersByPinnedAndTime(
        calculatedTimers,
        ["Pinned"],
        "desc",
        true,
        30_000,
      ).map((timer) => timer.timerKey),
    ).toEqual(["pinned", "active", "expired", "deleted"]);
  });

  it("filters timers by removal threshold, guild, visibility, search, npc type, level, and color", () => {
    const timers = [
      createTimerWithTimeLeft({
        guildId: "guild-1",
        timerKey: "visible-hero",
        npc: {
          ...createTimer().npc,
          name: "Tanroth",
          type: NpcType.HERO,
          lvl: 120,
        },
        maxTimeLeft: 2000,
      }),
      createTimerWithTimeLeft({
        guildId: "guild-2",
        timerKey: "hidden-elite",
        npc: {
          ...createTimer().npc,
          name: "Mushita",
          type: NpcType.ELITE2,
          lvl: 80,
        },
        maxTimeLeft: -50_000,
      }),
      createTimerWithTimeLeft({
        guildId: "guild-1",
        timerKey: "zero-level",
        npc: {
          ...createTimer().npc,
          name: "Mailbox",
          type: NpcType.NPC,
          lvl: 0,
        },
      }),
    ];

    expect(filterTimersByRemovalTime(timers, 30_000)).toHaveLength(2);
    expect(filterTimersByGuild(timers, "guild-1")).toHaveLength(2);
    expect(filterTimersByVisibility(timers, ["Mushita"], false)).toHaveLength(
      2,
    );
    expect(filterTimersByVisibility(timers, ["Mushita"], true)).toHaveLength(3);
    expect(filterTimersBySearchText(timers, "tan")).toEqual([timers[0]]);
    expect(filterTimersByNpcType(timers, [NpcType.HERO])).toEqual([
      timers[0],
      timers[2],
    ]);
    expect(filterTimersByLevel(timers, 100, 130)).toEqual([
      timers[0],
      timers[2],
    ]);
    expect(
      filterTimersByColor(timers, ["red"], {
        Tanroth: "red",
        Mushita: "blue",
      }),
    ).toEqual([timers[0]]);
  });

  it("keeps expired non-manual timers when they are marked as always visible", () => {
    const activeManualTimer = createTimerWithTimeLeft({
      timerKey: "active-manual",
      npc: {
        ...createTimer().npc,
        name: "Manual active",
        margonemType: 999,
      },
      maxTimeLeft: 10_000,
    });
    const expiredManualTimer = createTimerWithTimeLeft({
      timerKey: "expired-manual",
      npc: {
        ...createTimer().npc,
        name: "Manual expired",
        margonemType: 999,
      },
      maxTimeLeft: -50_000,
    });
    const expiredAutoTimer = createTimerWithTimeLeft({
      timerKey: "expired-auto",
      npc: {
        ...createTimer().npc,
        name: "Auto expired",
        margonemType: 4,
      },
      maxTimeLeft: -50_000,
    });

    expect(
      filterTimersByExpiredVisibility(
        [activeManualTimer, expiredManualTimer, expiredAutoTimer],
        30_000,
        { pandora: ["expired-auto"] },
      ),
    ).toEqual([activeManualTimer, expiredAutoTimer]);
  });

  it("sorts pinned timers first and then sorts by max spawn time in the requested direction", () => {
    const timers = [
      createTimerWithTimeLeft({
        timerKey: "timer-a",
        npc: {
          ...createTimer().npc,
          name: "Mushita",
        },
        maxSpawnTime: "2026-04-22T10:03:00.000Z",
      }),
      createTimerWithTimeLeft({
        timerKey: "timer-b",
        npc: {
          ...createTimer().npc,
          name: "Tanroth",
        },
        maxSpawnTime: "2026-04-22T10:01:00.000Z",
      }),
      createTimerWithTimeLeft({
        timerKey: "timer-c",
        npc: {
          ...createTimer().npc,
          name: "Raróg",
        },
        maxSpawnTime: "2026-04-22T10:02:00.000Z",
      }),
    ];

    expect(
      sortTimersByPinnedAndTime(timers, ["Raróg"], "asc").map(
        (timer) => timer.npc.name,
      ),
    ).toEqual(["Raróg", "Tanroth", "Mushita"]);
    expect(
      sortTimersByPinnedAndTime(timers, ["Raróg"], "desc").map(
        (timer) => timer.npc.name,
      ),
    ).toEqual(["Raróg", "Mushita", "Tanroth"]);
  });

  it("sorts expired timers at the bottom when requested", () => {
    const timers = [
      createTimerWithTimeLeft({
        timerKey: "expired-old",
        npc: {
          ...createTimer().npc,
          name: "Expired old",
        },
        maxSpawnTime: "2026-04-22T10:00:00.000Z",
        maxTimeLeft: -1,
      }),
      createTimerWithTimeLeft({
        timerKey: "expired-new",
        npc: {
          ...createTimer().npc,
          name: "Expired new",
        },
        maxSpawnTime: "2026-04-22T10:02:00.000Z",
        maxTimeLeft: -1,
      }),
      createTimerWithTimeLeft({
        timerKey: "active",
        npc: {
          ...createTimer().npc,
          name: "Active",
        },
        maxSpawnTime: "2026-04-22T10:01:00.000Z",
        maxTimeLeft: 1,
      }),
    ];

    expect(
      sortTimersByPinnedAndTime(timers, [], "asc", true, 0).map(
        (timer) => timer.npc.name,
      ),
    ).toEqual(["Active", "Expired new", "Expired old"]);
    expect(
      sortTimersByPinnedAndTime(timers, [], "desc", true, 0).map(
        (timer) => timer.npc.name,
      ),
    ).toEqual(["Active", "Expired old", "Expired new"]);
  });

  it("moves expired timers to the bottom only after the removal timeout passes", () => {
    const timers = [
      createTimerWithTimeLeft({
        timerKey: "expired-before-threshold",
        npc: {
          ...createTimer().npc,
          name: "Expired before threshold",
        },
        maxSpawnTime: "2026-04-22T10:00:00.000Z",
        maxTimeLeft: -10_000,
      }),
      createTimerWithTimeLeft({
        timerKey: "expired-after-threshold",
        npc: {
          ...createTimer().npc,
          name: "Expired after threshold",
        },
        maxSpawnTime: "2026-04-22T10:01:00.000Z",
        maxTimeLeft: -40_000,
      }),
      createTimerWithTimeLeft({
        timerKey: "active",
        npc: {
          ...createTimer().npc,
          name: "Active",
        },
        maxSpawnTime: "2026-04-22T10:02:00.000Z",
        maxTimeLeft: 120_000,
      }),
    ];

    expect(
      sortTimersByPinnedAndTime(timers, [], "asc", true, 30_000).map(
        (timer) => timer.npc.name,
      ),
    ).toEqual([
      "Expired before threshold",
      "Active",
      "Expired after threshold",
    ]);
    expect(
      sortTimersByPinnedAndTime(timers, [], "desc", true, 30_000).map(
        (timer) => timer.npc.name,
      ),
    ).toEqual([
      "Active",
      "Expired before threshold",
      "Expired after threshold",
    ]);
  });
});
