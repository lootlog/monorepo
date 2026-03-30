import type { Timer } from "@/hooks/api/use-timers";
import type { Npc } from "@/hooks/api/use-npcs";
import type { GuildMember } from "@/hooks/api/use-guild-members";

let timerIdCounter = 1;
let memberIdCounter = 1;

export function createMockNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 1,
    name: "Test Boss",
    lvl: 100,
    type: "ELITE",
    margonemType: 1,
    minRespawnSeconds: 3600,
    maxRespawnSeconds: 3600,
    respawnRandomness: 10,
    ...overrides,
  } as Npc;
}

export function createMockMember(
  overrides: Partial<GuildMember> = {},
): GuildMember {
  return {
    id: memberIdCounter++,
    userId: `user-${memberIdCounter}`,
    guildId: "guild-1",
    name: `Player ${memberIdCounter}`,
    avatar: null,
    active: true,
    ...overrides,
  } as GuildMember;
}

export interface CreateMockTimerOptions {
  npcId?: number;
  timerKey?: string;
  guildId?: string;
  world?: string;
  minSpawnTime?: Date;
  maxSpawnTime?: Date;
  member?: GuildMember;
  npc?: Partial<Npc>;
  isPending?: boolean;
  wasReset?: boolean;
  updatedAt?: Date;
}

export function createMockTimer(options: CreateMockTimerOptions = {}): Timer {
  const {
    npcId = timerIdCounter++,
    timerKey,
    guildId = "guild-1",
    world = "Aether",
    minSpawnTime = new Date(Date.now() + 3000000),
    maxSpawnTime = new Date(Date.now() + 3600000),
    member = createMockMember(),
    npc = {},
    isPending = false,
    wasReset = false,
    updatedAt = new Date(),
  } = options;
  const resolvedNpc = createMockNpc({ id: npcId, ...npc });
  const resolvedTimerKey =
    timerKey ??
    `${npcId}:${resolvedNpc.name.trim().toLowerCase().replace(/\s+/g, " ")}`;

  return {
    npcId,
    timerKey: resolvedTimerKey,
    guildId,
    world,
    minSpawnTime,
    maxSpawnTime,
    member,
    npc: resolvedNpc,
    isPending,
    wasReset,
    updatedAt,
  };
}

export function resetCounters() {
  timerIdCounter = 1;
  memberIdCounter = 1;
}
