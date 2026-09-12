import type {
  TimerHistoryResponseDto,
  UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import type { GuildMember } from "@/types/guild-member";

export const createTimerFixture = (overrides: Partial<Timer> = {}): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: "2026-04-22T10:00:00.000Z",
  maxSpawnTime: "2026-04-22T10:05:00.000Z",
  updatedAt: "2026-04-22T09:59:00.000Z",
  wasReset: false,
  npc: {
    id: 10,
    name: "Tanroth",
    lvl: 120,
    prof: "W",
    icon: "icon.gif",
    wt: 85,
    type: NpcType.HERO,
    margonemType: 2,
    location: "Ruins",
  },
  ...overrides,
});

export const createTimerMemberFixture = (
  overrides: Partial<GuildMember> = {},
): GuildMember => ({
  id: 1,
  userId: "user-1",
  name: "Tester",
  guildId: "guild-1",
  type: "USER",
  ...overrides,
});

export const createTimerHistoryFixture = (
  overrides: Partial<TimerHistoryResponseDto> = {},
): TimerHistoryResponseDto => ({
  id: 1,
  guildId: "guild-1",
  guildName: "Lootlog",
  world: "pandora",
  timerKey: "123:tanroth",
  npcId: 123,
  npc: {
    id: 123,
    name: "Tanroth",
    prof: "w",
    location: "",
    wt: "",
    lvl: 120,
    type: "HERO",
    icon: "",
    margonemType: "2",
  },
  action: "DELETE",
  member: {
    id: 10,
    userId: "user-1",
    guildId: "guild-1",
    type: "USER",
    name: "Salvatore",
    active: true,
    roles: [],
    updatedAt: "2026-05-03T10:00:00.000Z",
  },
  actorCharacter: {
    name: "Zorin",
    prof: "BLADE_DANCER",
    icon: "",
    lvl: 300,
    characterId: 100,
    accountId: 200,
  },
  minSpawnTime: new Date(2026, 4, 3, 12, 5).toISOString(),
  maxSpawnTime: new Date(2026, 4, 3, 12, 10).toISOString(),
  canRestore: true,
  createdAt: new Date(2026, 4, 3, 12, 1, 2).toISOString(),
  ...overrides,
});

export const createTimerGuildFixture = (
  overrides: Partial<UserCurrentGuildResponseDtoOutput> = {},
): UserCurrentGuildResponseDtoOutput => ({
  id: "guild-1",
  name: "Alpha",
  ownerId: "owner",
  publicStatsCardEnabled: false,
  hasLootlogAccess: true,
  isAccessDataStale: false,
  ...overrides,
});
