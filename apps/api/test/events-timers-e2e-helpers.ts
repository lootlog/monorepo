import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/db/prisma.service";
import {
  type Event,
  type EventHeroKill,
  type EventHeroNpc,
  type EventMap,
  type EventMapLocation,
  type EventRanking,
  type Guild,
  type Member,
  Permission,
  type Role,
} from "../src/generated/prisma/client";
import { buildTimerKey } from "../src/timers/utils/timer-key";
import { createTestingModuleWithMocks } from "./test-module-helpers";

export const TEST_AUTH = {
  userId: "e2e-user",
  discordId: "e2e-discord",
};

export const FORBIDDEN_AUTH = {
  userId: "e2e-forbidden-user",
  discordId: "e2e-forbidden-discord",
};

export const TEST_NPC = {
  id: 12345,
  name: "E2E Hero",
  location: "E2E Cave",
  lvl: 100,
  prof: "w",
  wt: 80,
  icon: "e2e-hero.gif",
  type: 2,
};

export const TEST_WORLD = "e2e-world";

export function withAuth(
  req: request.Test,
  auth: { userId: string; discordId: string } = TEST_AUTH,
) {
  return req
    .set("x-auth-discord-id", auth.discordId)
    .set("x-auth-user-id", auth.userId);
}

export async function createE2EApp() {
  const moduleFixture = await createTestingModuleWithMocks({
    imports: [AppModule],
  });
  const app = moduleFixture.createNestApplication();
  app.enableShutdownHooks();
  await app.init();
  await app.listen(0);

  return {
    app,
    prisma: app.get<PrismaService>(PrismaService),
    redis: app.get<RedisService>(RedisService),
  };
}

export async function closeE2EApp(
  app: INestApplication,
  prisma: PrismaService,
) {
  await prisma.$disconnect();
  await app.close();
  await new Promise((resolve) => setTimeout(resolve, 500));
}

export async function resetEventsTimersState(
  prisma: PrismaService,
  redis: RedisService,
) {
  await prisma.$executeRaw`TRUNCATE TABLE "Guild", "Role", "Member", "Timer", "UserCharactersLootlogSettings", "Event", "EventHeroNpc", "EventMap", "EventMapLocation", "EventMapAssignmentHistory", "EventMapCoverageGap", "EventPresenceLog", "EventHeroKill", "EventKillPoint", "EventRanking", "EventPointsEditHistory", "EventRespawnWindowSummary" CASCADE`;
  await Promise.all([
    redis.deleteByPattern("timer:*"),
    redis.deleteByPattern("perms:*"),
    redis.deleteByPattern("guild:*"),
    redis.deleteByPattern("user-lootlog-config:*"),
    redis.deleteByPattern("event:*"),
  ]);
}

export async function createGuildFixture(
  prisma: PrismaService,
  overrides: Partial<Guild> = {},
) {
  return prisma.guild.create({
    data: {
      id: overrides.id ?? "e2e-guild",
      name: overrides.name ?? "E2E Guild",
      icon: overrides.icon ?? null,
      ownerId: overrides.ownerId ?? "e2e-owner",
    },
  });
}

export async function createMemberFixture(
  prisma: PrismaService,
  params: {
    guildId: string;
    auth?: { userId: string; discordId: string };
    permissions?: Permission[];
    roleId?: string;
    type?: "OWNER" | "ADMIN" | "USER" | "BOT";
    lvlRangeFrom?: number | null;
    lvlRangeTo?: number | null;
  },
): Promise<{ role: Role; member: Member }> {
  const auth = params.auth ?? TEST_AUTH;
  const role = await prisma.role.create({
    data: {
      id: params.roleId ?? `${auth.discordId}-role`,
      guildId: params.guildId,
      name: `${auth.discordId} role`,
      permissions: params.permissions ?? [],
      lvlRangeFrom: params.lvlRangeFrom,
      lvlRangeTo: params.lvlRangeTo,
    },
  });
  const member = await prisma.member.create({
    data: {
      userId: auth.discordId,
      guildId: params.guildId,
      name: `${auth.discordId} member`,
      globalUserId: auth.userId,
      type: params.type ?? "USER",
      roles: { connect: { id: role.id } },
    },
  });

  return { role, member };
}

export async function createEventFixture(
  prisma: PrismaService,
  params: {
    guildId: string;
    world?: string;
    name?: string;
    heroName?: string;
    npcId?: number | null;
    npcLvl?: number | null;
    mapId?: number;
    mapName?: string;
    participationConfirmationMinutes?: number;
  },
): Promise<{
  event: Event;
  hero: EventHeroNpc;
  map: EventMap;
}> {
  const event = await prisma.event.create({
    data: {
      guildId: params.guildId,
      name: params.name ?? "E2E Event",
      world: params.world ?? TEST_WORLD,
      basePointsPerKill: 1,
      participationConfirmationMinutes:
        params.participationConfirmationMinutes ?? 0,
    },
  });
  const hero = await prisma.eventHeroNpc.create({
    data: {
      eventId: event.id,
      npcId: params.npcId === undefined ? TEST_NPC.id : params.npcId,
      npcName: params.heroName ?? TEST_NPC.name,
      npcIcon: TEST_NPC.icon,
      npcLvl: params.npcLvl === undefined ? TEST_NPC.lvl : params.npcLvl,
    },
  });
  const map = await prisma.eventMap.create({
    data: {
      heroNpcId: hero.id,
      mapId: params.mapId ?? 5001,
      mapName: params.mapName ?? "E2E Map",
    },
  });

  return { event, hero, map };
}

export async function createLocationFixture(
  prisma: PrismaService,
  params: {
    heroNpcId: string;
    name?: string;
    order?: number;
  },
): Promise<EventMapLocation> {
  return prisma.eventMapLocation.create({
    data: {
      heroNpcId: params.heroNpcId,
      name: params.name ?? "E2E Location",
      order: params.order ?? 0,
    },
  });
}

export async function createTimerFixture(
  prisma: PrismaService,
  params: {
    guildId: string;
    memberId: number;
    world?: string;
    npc?: typeof TEST_NPC;
    minSpawnTime?: Date;
    maxSpawnTime?: Date;
  },
) {
  const npc = params.npc ?? TEST_NPC;
  return prisma.timer.create({
    data: {
      guildId: params.guildId,
      createdById: params.memberId,
      world: params.world ?? TEST_WORLD,
      npcId: npc.id,
      timerKey: buildTimerKey(npc.id, npc.name),
      minSpawnTime: params.minSpawnTime ?? new Date(Date.now() + 600_000),
      maxSpawnTime: params.maxSpawnTime ?? new Date(Date.now() + 900_000),
      latestRespBaseSeconds: 3600,
      latestRespawnRandomness: 10,
      wasReset: false,
      npc,
    },
  });
}

export async function createKillFixture(
  prisma: PrismaService,
  params: {
    eventId: string;
    heroNpcId: string;
    member: Member;
    heroNpcName?: string;
    confirmationDeadlineAt?: Date | null;
    confirmedAt?: Date | null;
  },
): Promise<{
  kill: EventHeroKill;
  ranking: EventRanking;
  killPointId: string;
}> {
  const kill = await prisma.eventHeroKill.create({
    data: {
      heroNpcId: params.heroNpcId,
      killedAt: new Date(Date.now() - 60_000),
      minSpawnTimeAtKill: new Date(Date.now() - 900_000),
      maxSpawnTimeAtKill: new Date(Date.now() - 120_000),
      timerCreatedById: params.member.id,
    },
  });
  const killPoint = await prisma.eventKillPoint.create({
    data: {
      killId: kill.id,
      memberId: params.member.id,
      basePoints: 1,
      points: 1,
      trackingDurationSeconds: 600,
      trackingDurationPercentage: 100,
      confirmationDeadlineAt: params.confirmationDeadlineAt ?? null,
      confirmedAt:
        params.confirmedAt === undefined ? new Date() : params.confirmedAt,
      timeOnMapSeconds: 600,
      afkPercentage: 0,
      wasPresent: true,
      bonusBreakdown: [],
      mapPresenceData: [],
    },
  });
  const ranking = await prisma.eventRanking.create({
    data: {
      eventId: params.eventId,
      memberId: params.member.id,
      heroNpcName: params.heroNpcName ?? TEST_NPC.name,
      totalPoints: 1,
      totalKills: 1,
      totalTimeSeconds: 600,
    },
  });

  return { kill, ranking, killPointId: killPoint.id };
}

export function createEventPayload(overrides = {}) {
  return {
    name: "Created E2E Event",
    world: TEST_WORLD,
    basePointsPerKill: 1,
    heroNpcs: [
      {
        npcId: TEST_NPC.id,
        npcName: TEST_NPC.name,
        maps: [{ mapId: 5001, mapName: "E2E Map" }],
      },
    ],
    ...overrides,
  };
}

export function createAutoTimerPayload(overrides = {}) {
  return {
    respBaseSeconds: 3600,
    respawnRandomness: 10,
    world: TEST_WORLD,
    accountId: "e2e-account",
    characterId: "e2e-character",
    npc: TEST_NPC,
    ...overrides,
  };
}
