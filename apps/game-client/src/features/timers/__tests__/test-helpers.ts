import type { Timer } from "@/hooks/api/use-timers";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { NpcType } from "@/hooks/api/use-npcs";

export const createMockTimer = (overrides: Partial<Timer> = {}): Timer => {
  const defaultNpc = {
    id: 1,
    name: "Dragon Boss",
    type: NpcType.HERO,
    lvl: 100,
    prof: "warrior",
    icon: "icon.png",
    wt: 1,
    margonemType: 1,
  };
  const resolvedNpc = {
    ...defaultNpc,
    ...overrides.npc,
  };
  const resolvedNpcId = overrides.npcId ?? resolvedNpc.id;
  const resolvedTimerKey =
    overrides.timerKey ??
    `${resolvedNpcId}:${resolvedNpc.name.trim().toLowerCase().replace(/\s+/g, "-")}`;

  return {
    id: "1",
    npcId: resolvedNpcId,
    timerKey: resolvedTimerKey,
    guildId: "guild1",
    world: "world1",
    minSpawnTime: new Date("2024-01-01T10:00:00Z"),
    maxSpawnTime: new Date("2024-01-01T12:00:00Z"),
    updatedAt: new Date("2024-01-01T08:00:00Z"),
    wasReset: false,
    isPending: false,
    npc: resolvedNpc,
    member: undefined,
    ...overrides,
  } as Timer;
};

export const createMockTimerWithTimeLeft = (
  overrides: Partial<TimerWithTimeLeft> = {},
): TimerWithTimeLeft => {
  return {
    ...createMockTimer(overrides),
    maxTimeLeft: 10000,
    minTimeLeft: 5000,
    members: [],
    ...overrides,
  };
};
