import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { Permission } from "@lootlog/schema/permissions";
import { AppModule } from "../src/app.module.js";
import { TestDatabase } from "./test-database.js";
import { buildTimerKey } from "../src/timers/utils/timer-key.js";
import { createTestingModuleWithMocks } from "./test-module-helpers.js";
import { TEST_GUILDS, TEST_USERS } from "./test-helpers.js";

const eventNpc = {
  id: 123,
  name: "Event Hero",
  location: "Event Cave",
  lvl: 100,
  prof: "w",
  wt: 80,
  icon: "event-hero.gif",
  type: 2,
};

const testUsers = [
  { id: "event-user-1", discordId: "event-discord-1" },
  { id: "event-user-2", discordId: "event-discord-2" },
  { id: "event-user-3", discordId: "event-discord-3" },
] as const;

function createTimerPayload(
  customMinSpawnTime: Date,
  customMaxSpawnTime: Date,
) {
  return {
    respBaseSeconds: 3600,
    customMinSpawnTime: customMinSpawnTime.toISOString(),
    customMaxSpawnTime: customMaxSpawnTime.toISOString(),
    world: "event-world",
    accountId: "event-account",
    characterId: "event-character",
    npc: eventNpc,
  };
}

async function waitFor(
  assertion: () => Promise<boolean>,
  timeoutMs = 5000,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await assertion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("Timed out waiting for e2e assertion");
}

describe("Events E2E Tests (Timer Kill Deduplication)", () => {
  let app: INestApplication;
  let database: TestDatabase;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
    await app.listen(0);

    database = await new TestDatabase().initialize();
    redis = app.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (database) {
      await database.dispose();
    }
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  beforeEach(async () => {
    await database.truncate(
      "Guild",
      "Role",
      "Member",
      "Timer",
      "UserCharactersLootlogSettings",
      "Event",
      "EventHeroNpc",
      "EventMap",
      "EventMapAssignmentHistory",
      "EventHeroKill",
      "EventKillPoint",
      "EventRanking",
      "EventRespawnWindowSummary",
    );
    await redis.deleteByPattern("timer:*");
    await redis.deleteByPattern("perms:*");
    await redis.deleteByPattern("guild:*");
    await redis.deleteByPattern("event:hero:kill:*");
  });

  it("records one event kill when multiple users submit timers for the same killed NPC", async () => {
    const guild = await database.guild.create({ data: TEST_GUILDS.GUILD_1 });
    const role = await database.role.create({
      data: {
        id: "event-role-1",
        guildId: guild.id,
        name: "Event Member",
        permissions: [
          Permission.LOOTLOG_TIMERS_WRITE,
          Permission.LOOTLOG_EVENTS_READ,
        ],
      },
    });
    const members = await Promise.all(
      testUsers.map((user, index) =>
        database.member.create({
          data: {
            userId: user.discordId,
            guildId: guild.id,
            name: `Event Member ${index + 1}`,
            globalUserId: user.id,
            roles: { connect: { id: role.id } },
          },
        }),
      ),
    );
    await database.userCharactersLootlogSettings.createMany({
      data: testUsers.map((user) => ({
        userId: user.discordId,
        accountId: "event-account",
        characterId: "event-character",
        catchingGuildIds: [guild.id],
      })),
    });
    const event = await database.event.create({
      data: {
        guildId: guild.id,
        name: "Timer Dedup Event",
        world: "event-world",
        basePointsPerKill: 1,
        participationConfirmationMinutes: 0,
      },
    });
    const hero = await database.eventHeroNpc.create({
      data: {
        eventId: event.id,
        npcId: eventNpc.id,
        npcName: eventNpc.name,
        npcIcon: eventNpc.icon,
        npcLvl: eventNpc.lvl,
      },
    });
    const eventMap = await database.eventMap.create({
      data: {
        heroNpcId: hero.id,
        mapId: 5001,
        mapName: "Event Cave",
        assignedMembers: {
          connect: members.map((member) => ({ id: member.id })),
        },
      },
    });
    await database.eventMapAssignmentHistory.createMany({
      data: members.map((member) => ({
        mapId: eventMap.id,
        heroNpcId: hero.id,
        memberId: member.id,
        assignedAt: new Date(Date.now() - 30 * 60 * 1000),
      })),
    });

    const previousMinSpawnTime = new Date(Date.now() - 20 * 60 * 1000);
    const previousMaxSpawnTime = new Date(Date.now() - 5 * 60 * 1000);
    const timerKey = buildTimerKey(eventNpc.id, eventNpc.name);
    await database.timer.create({
      data: {
        guildId: guild.id,
        createdById: members[0].id,
        world: "event-world",
        npcId: eventNpc.id,
        timerKey,
        minSpawnTime: previousMinSpawnTime,
        maxSpawnTime: previousMaxSpawnTime,
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
        wasReset: false,
        npc: eventNpc,
        windowOpenedAt: previousMinSpawnTime,
      },
    });

    const firstMinSpawnTime = new Date(Date.now() + 30 * 60 * 1000);
    const firstMaxSpawnTime = new Date(Date.now() + 40 * 60 * 1000);
    const secondMinSpawnTime = new Date(Date.now() + 35 * 60 * 1000);
    const secondMaxSpawnTime = new Date(Date.now() + 45 * 60 * 1000);
    const thirdMinSpawnTime = new Date(Date.now() + 36 * 60 * 1000);
    const thirdMaxSpawnTime = new Date(Date.now() + 46 * 60 * 1000);

    for (const [index, user] of testUsers.entries()) {
      const minSpawnTime = [
        firstMinSpawnTime,
        secondMinSpawnTime,
        thirdMinSpawnTime,
      ][index];
      const maxSpawnTime = [
        firstMaxSpawnTime,
        secondMaxSpawnTime,
        thirdMaxSpawnTime,
      ][index];

      await request(app.getHttpServer())
        .post("/timers/auto")
        .set("x-auth-discord-id", user.discordId)
        .set("x-auth-user-id", user.id)
        .send(createTimerPayload(minSpawnTime, maxSpawnTime))
        .expect(201);
    }

    await waitFor(async () => {
      const [killCount, rankingCount] = await Promise.all([
        database.eventHeroKill.count({
          where: { heroNpcId: hero.id },
        }),
        database.eventRanking.count({
          where: { eventId: event.id },
        }),
      ]);
      return killCount === 1 && rankingCount === members.length;
    });

    const [timer, kills, rankings] = await Promise.all([
      database.timer.findUnique({
        where: {
          timerId: {
            guildId: guild.id,
            world: "event-world",
            timerKey,
          },
        },
      }),
      database.eventHeroKill.findMany({
        where: { heroNpcId: hero.id },
        include: { points: true },
      }),
      database.eventRanking.findMany({
        where: { eventId: event.id },
      }),
    ]);

    expect(timer).not.toBeNull();
    expect(timer?.minSpawnTime.getTime()).toBe(firstMinSpawnTime.getTime());
    expect(timer?.maxSpawnTime.getTime()).toBe(firstMaxSpawnTime.getTime());
    expect(kills).toHaveLength(1);
    expect(kills[0].points).toHaveLength(members.length);
    expect(rankings).toHaveLength(members.length);
    expect(rankings.every((ranking) => ranking.totalKills === 1)).toBe(true);
  });

  it("records one event kill when 50 users submit timers for the same killed NPC concurrently", async () => {
    const guild = await database.guild.create({ data: TEST_GUILDS.GUILD_1 });
    const role = await database.role.create({
      data: {
        id: "event-role-1",
        guildId: guild.id,
        name: "Event Member",
        permissions: [
          Permission.LOOTLOG_TIMERS_WRITE,
          Permission.LOOTLOG_EVENTS_READ,
        ],
      },
    });
    const users = Array.from({ length: 50 }, (_, index) => ({
      id: `event-burst-user-${index + 1}`,
      discordId: `event-burst-discord-${index + 1}`,
    }));
    const members = await Promise.all(
      users.map((user, index) =>
        database.member.create({
          data: {
            userId: user.discordId,
            guildId: guild.id,
            name: `Event Burst Member ${index + 1}`,
            globalUserId: user.id,
            roles: { connect: { id: role.id } },
          },
        }),
      ),
    );
    await database.userCharactersLootlogSettings.createMany({
      data: users.map((user) => ({
        userId: user.discordId,
        accountId: "event-account",
        characterId: "event-character",
        catchingGuildIds: [guild.id],
      })),
    });
    const event = await database.event.create({
      data: {
        guildId: guild.id,
        name: "Timer Burst Dedup Event",
        world: "event-world",
        basePointsPerKill: 1,
        participationConfirmationMinutes: 0,
      },
    });
    const hero = await database.eventHeroNpc.create({
      data: {
        eventId: event.id,
        npcId: eventNpc.id,
        npcName: eventNpc.name,
        npcIcon: eventNpc.icon,
        npcLvl: eventNpc.lvl,
      },
    });
    const eventMap = await database.eventMap.create({
      data: {
        heroNpcId: hero.id,
        mapId: 5001,
        mapName: "Event Cave",
        assignedMembers: {
          connect: members.map((member) => ({ id: member.id })),
        },
      },
    });
    await database.eventMapAssignmentHistory.createMany({
      data: members.map((member) => ({
        mapId: eventMap.id,
        heroNpcId: hero.id,
        memberId: member.id,
        assignedAt: new Date(Date.now() - 30 * 60 * 1000),
      })),
    });

    const previousMinSpawnTime = new Date(Date.now() - 20 * 60 * 1000);
    const previousMaxSpawnTime = new Date(Date.now() - 5 * 60 * 1000);
    const timerKey = buildTimerKey(eventNpc.id, eventNpc.name);
    await database.timer.create({
      data: {
        guildId: guild.id,
        createdById: members[0].id,
        world: "event-world",
        npcId: eventNpc.id,
        timerKey,
        minSpawnTime: previousMinSpawnTime,
        maxSpawnTime: previousMaxSpawnTime,
        latestRespBaseSeconds: 3600,
        latestRespawnRandomness: 10,
        wasReset: false,
        npc: eventNpc,
        windowOpenedAt: previousMinSpawnTime,
      },
    });

    const responses = await Promise.all(
      users.map((user, index) => {
        const minSpawnTime = new Date(Date.now() + (30 * 60 + index) * 1000);
        const maxSpawnTime = new Date(Date.now() + (40 * 60 + index) * 1000);

        return request(app.getHttpServer())
          .post("/timers/auto")
          .set("x-auth-discord-id", user.discordId)
          .set("x-auth-user-id", user.id)
          .send(createTimerPayload(minSpawnTime, maxSpawnTime));
      }),
    );

    expect(
      responses.every((response) => [201, 409].includes(response.status)),
    ).toBe(true);
    expect(responses.some((response) => response.status === 201)).toBe(true);

    await waitFor(async () => {
      const [killCount, rankingCount] = await Promise.all([
        database.eventHeroKill.count({
          where: { heroNpcId: hero.id },
        }),
        database.eventRanking.count({
          where: { eventId: event.id },
        }),
      ]);
      return killCount === 1 && rankingCount === members.length;
    });

    const [timers, kills, rankings] = await Promise.all([
      database.timer.findMany({
        where: {
          guildId: guild.id,
          world: "event-world",
          timerKey,
        },
      }),
      database.eventHeroKill.findMany({
        where: { heroNpcId: hero.id },
        include: { points: true },
      }),
      database.eventRanking.findMany({
        where: { eventId: event.id },
      }),
    ]);

    expect(timers).toHaveLength(1);
    expect(kills).toHaveLength(1);
    expect(kills[0].points).toHaveLength(members.length);
    expect(rankings).toHaveLength(members.length);
    expect(rankings.every((ranking) => ranking.totalKills === 1)).toBe(true);
  });

  it("should forbid event creation without manage permission and create no event", async () => {
    const guild = await database.guild.create({ data: TEST_GUILDS.GUILD_1 });
    const role = await database.role.create({
      data: {
        id: "event-role-1",
        guildId: guild.id,
        name: "Event Reader",
        permissions: [Permission.LOOTLOG_EVENTS_READ],
      },
    });
    await database.member.create({
      data: {
        userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        guildId: guild.id,
        name: "Event Reader",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roles: { connect: { id: role.id } },
      },
    });

    await request(app.getHttpServer())
      .post(`/guilds/${guild.id}/events`)
      .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
      .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
      .send({
        name: "Forbidden Event",
        world: "event-world",
        heroNpcs: [],
      })
      .expect(403);

    await expect(database.event.count()).resolves.toBe(0);
  });

  it("should forbid reading events without events read permission", async () => {
    const guild = await database.guild.create({ data: TEST_GUILDS.GUILD_1 });
    const role = await database.role.create({
      data: {
        id: "event-role-1",
        guildId: guild.id,
        name: "Timer Writer",
        permissions: [Permission.LOOTLOG_TIMERS_WRITE],
      },
    });
    await database.member.create({
      data: {
        userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        guildId: guild.id,
        name: "Timer Writer",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roles: { connect: { id: role.id } },
      },
    });
    await database.event.create({
      data: {
        guildId: guild.id,
        name: "Readable Event",
        world: "event-world",
      },
    });

    await request(app.getHttpServer())
      .get(`/guilds/${guild.id}/events`)
      .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
      .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
      .expect(403);
  });
});
