import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import { describe, expect, it } from "vitest";
import {
  filterTimersByRemovalTime,
  getTimerTimeLeft,
  isManualTimer,
  type TimerWithTimeLeft,
} from "./timers-utils";

const createTimer = (overrides: Partial<Timer> = {}): Timer => ({
  guildId: "guild-1",
  maxSpawnTime: "2026-04-22T10:02:30.000Z",
  minSpawnTime: "2026-04-22T10:01:00.000Z",
  npc: {
    icon: "icon.gif",
    id: 101,
    location: "Kwieciste Przejście",
    lvl: 120,
    margonemType: 4,
    name: "Tanroth",
    prof: "W",
    type: NpcType.HERO,
    wt: 10,
  },
  npcId: 101,
  timerKey: "timer-1",
  updatedAt: "2026-04-22T10:00:00.000Z",
  wasReset: false,
  world: "pandora",
  ...overrides,
});

describe("timers-utils", () => {
  it("calculates Timer time from an explicit epoch", () => {
    const epoch = new Date("2026-04-22T10:00:00.000Z").getTime();

    expect(getTimerTimeLeft(createTimer(), epoch)).toEqual({
      maxTimeLeft: 150_000,
      minTimeLeft: 60_000,
    });
  });

  it("calculates deleted Timer time from deletedAt", () => {
    const epoch = new Date("2026-04-22T10:00:00.000Z").getTime();

    expect(
      getTimerTimeLeft(
        createTimer({ deletedAt: "2026-04-22T09:59:30.000Z" }),
        epoch,
      ),
    ).toEqual({
      maxTimeLeft: -30_000,
      minTimeLeft: -30_000,
    });
  });

  it("filters Timers after the removal delay", () => {
    const timers: TimerWithTimeLeft[] = [
      { ...createTimer(), maxTimeLeft: -29_999, minTimeLeft: -29_999 },
      { ...createTimer(), maxTimeLeft: -30_000, minTimeLeft: -30_000 },
    ];

    expect(filterTimersByRemovalTime(timers, 30_000)).toEqual([timers[0]]);
  });

  it("recognizes manual Timers", () => {
    expect(
      isManualTimer(
        createTimer({ npc: { ...createTimer().npc, margonemType: 999 } }),
      ),
    ).toBe(true);
  });
});
