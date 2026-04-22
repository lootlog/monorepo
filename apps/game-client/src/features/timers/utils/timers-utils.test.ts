import { afterEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import {
  calculateTimeLeft,
  filterTimersByColor,
  filterTimersByGuild,
  filterTimersByLevel,
  filterTimersByNpcType,
  filterTimersByRemovalTime,
  filterTimersBySearchText,
  filterTimersByVisibility,
  mergeTimers,
  sortTimersByPinnedAndTime,
  type TimerWithTimeLeft,
} from "./timers-utils";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: overrides?.guildId ?? "guild-1",
  timerKey: overrides?.timerKey ?? "timer-1",
  world: overrides?.world ?? "pandora",
  npcId: overrides?.npcId ?? 101,
  minSpawnTime: overrides?.minSpawnTime ?? "2026-04-22T10:05:00.000Z",
  maxSpawnTime: overrides?.maxSpawnTime ?? "2026-04-22T10:10:00.000Z",
  updatedAt: overrides?.updatedAt ?? "2026-04-22T10:00:00.000Z",
  wasReset: overrides?.wasReset ?? false,
  npc: {
    id: overrides?.npc?.id ?? 101,
    name: overrides?.npc?.name ?? "Tanroth",
    lvl: overrides?.npc?.lvl ?? 120,
    prof: overrides?.npc?.prof ?? "W",
    icon: overrides?.npc?.icon ?? "icon.gif",
    wt: overrides?.npc?.wt ?? 10,
    type: overrides?.npc?.type ?? NpcType.HERO,
    margonemType: overrides?.npc?.margonemType ?? 4,
    location: overrides?.npc?.location ?? "Kwieciste Przejście",
  },
  member: overrides?.member,
  members: overrides?.members,
  isCustomTime: overrides?.isCustomTime ?? false,
  isPending: overrides?.isPending ?? false,
});

const createTimerWithTimeLeft = (
  overrides?: Partial<TimerWithTimeLeft>,
): TimerWithTimeLeft => ({
  ...createTimer(overrides),
  minTimeLeft: overrides?.minTimeLeft ?? 60_000,
  maxTimeLeft: overrides?.maxTimeLeft ?? 120_000,
  members: overrides?.members,
  mergedGuildIds: overrides?.mergedGuildIds,
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
});
