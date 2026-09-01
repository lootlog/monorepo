import type { INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/db/prisma.service.js";
import { configureNativeEnumArrays, db as prismaDb } from "../src/prisma/db.js";
import type { FieldOutputTypes } from "../src/prisma/contract.js";
import { buildTimerKey } from "../src/timers/utils/timer-key.js";
import { createTestingModuleWithMocks } from "./test-module-helpers.js";

import { dateToTemporal } from "../src/db/temporal.js";
import { insertDatabaseFixture } from "./database-fixtures.js";
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
type Event = FieldOutputTypes["public"]["Event"];
type EventHeroKill = FieldOutputTypes["public"]["EventHeroKill"];
type EventHeroNpc = FieldOutputTypes["public"]["EventHeroNpc"];
type EventMap = FieldOutputTypes["public"]["EventMap"];
type EventMapLocation = FieldOutputTypes["public"]["EventMapLocation"];
type EventRanking = FieldOutputTypes["public"]["EventRanking"];
type Guild = FieldOutputTypes["public"]["Guild"];
type Member = FieldOutputTypes["public"]["Member"];
type Role = FieldOutputTypes["public"]["Role"];

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
  await configureNativeEnumArrays();
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
  _prisma: PrismaService,
) {
  await app.close();
  await new Promise((resolve) => setTimeout(resolve, 500));
}

export async function resetEventsTimersState(
  prisma: PrismaService,
  redis: RedisService,
) {
  await prisma.db
    .runtime()
    .execute(
      prisma.db.raw
        .sql`TRUNCATE TABLE "Guild", "Role", "Member", "Timer", "UserCharactersLootlogSettings", "Event", "EventHeroNpc", "EventMap", "EventMapLocation", "EventMapAssignmentHistory", "EventMapCoverageGap", "EventPresenceLog", "EventHeroKill", "EventKillPoint", "EventRanking", "EventPointsEditHistory", "EventRespawnWindowSummary" CASCADE`
        .affectedCount()
        .build(),
    );
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
  return insertDatabaseFixture(prisma, "Guild", {
    updatedAt: dateToTemporal(new Date()),
    ...{
      id: overrides.id ?? "e2e-guild",
      name: overrides.name ?? "E2E Guild",
      icon: overrides.icon ?? null,
      ownerId: overrides.ownerId ?? "e2e-owner",
      vanityUrl: overrides.vanityUrl ?? null,
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
  const role = await insertDatabaseFixture(prisma, "Role", {
    updatedAt: dateToTemporal(new Date()),
    ...{
      id: params.roleId ?? `${auth.discordId}-role`,
      guildId: params.guildId,
      name: `${auth.discordId} role`,
      position: 1,
      permissions: params.permissions ?? [],
      lvlRangeFrom: params.lvlRangeFrom,
      lvlRangeTo: params.lvlRangeTo,
    },
  });
  const member = await insertDatabaseFixture(prisma, "Member", {
    updatedAt: dateToTemporal(new Date()),
    ...{
      userId: auth.discordId,
      guildId: params.guildId,
      name: `${auth.discordId} member`,
      globalUserId: auth.userId,
      type: params.type ?? "USER",
      lastDiscordSyncAt: new Date(),
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
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
): Promise<{
  event: Event;
  hero: EventHeroNpc;
  map: EventMap;
}> {
  const event = await insertDatabaseFixture(prisma, "Event", {
    updatedAt: dateToTemporal(new Date()),
    ...{
      guildId: params.guildId,
      name: params.name ?? "E2E Event",
      world: params.world ?? TEST_WORLD,
      basePointsPerKill: 1,
      participationConfirmationMinutes:
        params.participationConfirmationMinutes ?? 0,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
    },
  });
  const hero = await insertDatabaseFixture(prisma, "EventHeroNpc", {
    eventId: event.id,
    npcId: params.npcId === undefined ? TEST_NPC.id : params.npcId,
    npcName: params.heroName ?? TEST_NPC.name,
    npcIcon: TEST_NPC.icon,
    npcLvl: params.npcLvl === undefined ? TEST_NPC.lvl : params.npcLvl,
  });
  const map = await insertDatabaseFixture(prisma, "EventMap", {
    updatedAt: dateToTemporal(new Date()),
    ...{
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
  return insertDatabaseFixture(prisma, "EventMapLocation", {
    updatedAt: dateToTemporal(new Date()),
    ...{
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
  return insertDatabaseFixture(prisma, "Timer", {
    updatedAt: dateToTemporal(new Date()),
    ...{
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
  const kill = await insertDatabaseFixture(prisma, "EventHeroKill", {
    heroNpcId: params.heroNpcId,
    killedAt: new Date(Date.now() - 60_000),
    minSpawnTimeAtKill: new Date(Date.now() - 900_000),
    maxSpawnTimeAtKill: new Date(Date.now() - 120_000),
    timerCreatedById: params.member.id,
  });
  const killPoint = await insertDatabaseFixture(prisma, "EventKillPoint", {
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
  });
  const ranking = await insertDatabaseFixture(prisma, "EventRanking", {
    updatedAt: dateToTemporal(new Date()),
    ...{
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
