import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/db/prisma.service";
import {
  createTestTimerPayload,
  TEST_GUILDS,
  TEST_USERS,
} from "./test-helpers";
import { createTestingModuleWithMocks } from "./test-module-helpers";
import { Permission } from "generated/client";
import { RedisService } from "@lootlog/nest-shared";

describe("Timers E2E Tests (Whitelist)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    redis = app.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Guild", "Role", "Member", "Timer", "UserCharactersLootlogSettings" CASCADE`;
    const keys = await redis.getClient().keys("timer:*");
    if (keys.length > 0) {
      await redis.getClient().del(...keys);
    }
  });

  describe("POST /guilds/:guildId/timers", () => {
    it("should create timer for specific guild", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const timerPayload = createTestTimerPayload();

      const response = await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body.guildId).toBe(guild1.id);
      expect(response.body.world).toBe("test-world");
      expect(response.body.npcId).toBe(1);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(1);
      expect(timers[0].guildId).toBe(guild1.id);
    });

    it("should support custom spawn times", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const customMin = new Date(Date.now() + 3600000);
      const customMax = new Date(Date.now() + 7200000);
      const timerPayload = createTestTimerPayload({
        customMinSpawnTime: customMin.toISOString(),
        customMaxSpawnTime: customMax.toISOString(),
      });

      const response = await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      const minTime = new Date(response.body.minSpawnTime).getTime();
      const maxTime = new Date(response.body.maxSpawnTime).getTime();
      const expectedMinTime = customMin.getTime();
      const expectedMaxTime = customMax.getTime();

      expect(Math.abs(minTime - expectedMinTime)).toBeLessThan(1000);
      expect(Math.abs(maxTime - expectedMaxTime)).toBeLessThan(1000);
    });

    it("should reject invalid custom spawn times", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const customMin = new Date(Date.now() + 7200000);
      const customMax = new Date(Date.now() + 3600000);
      const timerPayload = createTestTimerPayload({
        customMinSpawnTime: customMin.toISOString(),
        customMaxSpawnTime: customMax.toISOString(),
      });

      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(400);
    });

    it("should handle concurrent requests with locking", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const timerPayload = createTestTimerPayload();

      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post(`/guilds/${guild1.id}/timers`)
            .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
            .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
            .send(timerPayload),
        );

      const results = await Promise.all(requests);

      const successfulResponses = results.filter((r) => r.status === 201);
      const conflictResponses = results.filter((r) => r.status === 409);

      expect(successfulResponses.length).toBeGreaterThan(0);
      expect(successfulResponses.length + conflictResponses.length).toBe(10);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(1);

      const allSameTimer = successfulResponses.every(
        (r) => r.body.createdAt === successfulResponses[0].body.createdAt,
      );
      expect(allSameTimer).toBe(true);
    });

    it("should prevent race condition on 10 simultaneous requests", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const timerPayload = createTestTimerPayload();

      const startTime = Date.now();

      const results = await Promise.all(
        Array(10)
          .fill(null)
          .map(() =>
            request(app.getHttpServer())
              .post(`/guilds/${guild1.id}/timers`)
              .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
              .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
              .send(timerPayload),
          ),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      const statusCodes = results.map((r) => r.status);
      const successCount = statusCodes.filter((s) => s === 201).length;
      const conflictCount = statusCodes.filter((s) => s === 409).length;

      expect(successCount + conflictCount).toBe(10);
      expect(successCount).toBeGreaterThan(0);

      const timers = await prisma.timer.findMany({
        where: {
          guildId: guild1.id,
          world: timerPayload.world,
          npcId: timerPayload.npc.id,
        },
      });

      expect(timers).toHaveLength(1);
      expect(duration).toBeLessThan(5000);

      console.log(`Race condition test stats:
        - Total requests: 10
        - Successful (201): ${successCount}
        - Conflicts (409): ${conflictCount}
        - Duration: ${duration}ms
        - Timers in DB: ${timers.length}
      `);
    });

    it("should handle rapid sequential updates without data corruption", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const now = new Date();
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 999,
          createdById: member.id,
          minSpawnTime: now,
          maxSpawnTime: new Date(now.getTime() + 3600 * 1000),
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
          npc: {
            id: 999,
            name: "Test Boss",
            location: "Test Lair",
            wt: 20,
            prof: "w",
          },
        },
      });

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .patch(`/guilds/${guild1.id}/timers/999/reset`)
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send({ world: "test-world" })
          .expect(200);

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const timers = await prisma.timer.findMany({
        where: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 999,
        },
      });

      expect(timers).toHaveLength(1);
    });

    it("should deduplicate rapid requests", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const timerPayload = createTestTimerPayload();

      const response1 = await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response1.body.createdAt).toBe(response2.body.createdAt);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(1);
    });

    it("should invalidate cache after timer creation", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      const cacheKeysBefore = await redis
        .getClient()
        .keys(`timer:list:${guild1.id}:*`);
      expect(cacheKeysBefore.length).toBeGreaterThan(0);

      const writeRole = await prisma.role.update({
        where: { id: role.id },
        data: {
          permissions: [Permission.LOOTLOG_READ, Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.update({
        where: {
          memberId: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            guildId: guild1.id,
          },
        },
        data: {
          roles: {
            set: [{ id: writeRole.id }],
          },
        },
      });

      const timerPayload = createTestTimerPayload();
      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      const cacheKeysAfter = await redis
        .getClient()
        .keys(`timer:list:${guild1.id}:*`);
      expect(cacheKeysAfter.length).toBe(0);
    });

    it("should return 403 when user lacks LOOTLOG_WRITE permission", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITHOUT_ACCESS.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const timerPayload = createTestTimerPayload();

      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.id)
        .send(timerPayload)
        .expect(403);
    });
  });

  describe("GET /guilds/:guildId/timers (with cache)", () => {
    it("should cache timer list", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const futureDate = new Date(Date.now() + 3600000);
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 1,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
          npc: {
            id: 1,
            name: "Boss",
            location: "Lair",
            wt: 20,
            prof: "w",
          },
        },
      });

      const response1 = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response1.body).toHaveLength(1);

      const cacheKeys = await redis
        .getClient()
        .keys(`timer:list:${guild1.id}:*`);
      expect(cacheKeys.length).toBeGreaterThan(0);

      const response2 = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response2.body).toHaveLength(1);
    });
  });

  describe("GET /guilds/:guildId/timers/npcs/search", () => {
    it("should search NPCs with timer data", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const futureDate = new Date(Date.now() + 3600000);
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 123,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
          npc: {
            id: 123,
            name: "Smok Lodowy",
            location: "Lodowa Pustynia",
            wt: 450,
            lvl: 230,
            type: "ELITE2",
            prof: "Warrior",
            icon: "smok.png",
          },
        },
      });

      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 124,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 7200,
          latestRespawnRandomness: 15,
          npc: {
            id: 124,
            name: "Smok Ciemnosci",
            location: "Ciemna Pieczara",
            wt: 550,
            lvl: 280,
            type: "ELITE3",
            prof: "Mage",
            icon: "smok2.png",
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "Smok", world: "test-world" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toContain("Smok");
      expect(response.body[0].latestRespBaseSeconds).toBeDefined();
      expect(response.body[0].latestRespawnRandomness).toBeDefined();
    });

    it("should return only NPCs from specified world", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const futureDate = new Date(Date.now() + 3600000);
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "world-1",
          npcId: 123,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
          npc: {
            id: 123,
            name: "Boss",
            location: "Lair",
            wt: 450,
            lvl: 230,
            type: "ELITE2",
            prof: "w",
            icon: "boss.png",
          },
        },
      });

      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "world-2",
          npcId: 124,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 7200,
          latestRespawnRandomness: 15,
          npc: {
            id: 124,
            name: "Boss",
            location: "Cave",
            wt: 550,
            lvl: 280,
            type: "ELITE3",
            prof: "m",
            icon: "boss2.png",
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "Boss", world: "world-1" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].npcId).toBe(123);
    });

    it("should respect limit parameter", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const futureDate = new Date(Date.now() + 3600000);
      for (let i = 1; i <= 5; i++) {
        await prisma.timer.create({
          data: {
            guildId: guild1.id,
            world: "test-world",
            npcId: 100 + i,
            createdById: member.id,
            minSpawnTime: new Date(),
            maxSpawnTime: futureDate,
            latestRespBaseSeconds: 3600,
            latestRespawnRandomness: 10,
            npc: {
              id: 100 + i,
              name: `Test NPC ${i}`,
              location: "Test Location",
              wt: 450,
              lvl: 200,
              type: "ELITE",
              prof: "w",
              icon: "npc.png",
            },
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "Test", world: "test-world", limit: 2 })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it("should return empty array when no NPCs match search", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "NonExistentNPC", world: "test-world" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it("should return latest timer data when NPC has multiple timers", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const futureDate = new Date(Date.now() + 3600000);
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 999,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
          npc: {
            id: 999,
            name: "Test Boss",
            location: "Lair",
            wt: 450,
            lvl: 200,
            type: "ELITE",
            prof: "w",
            icon: "boss.png",
          },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await prisma.timer.update({
        where: {
          timerId: {
            guildId: guild1.id,
            world: "test-world",
            npcId: 999,
          },
        },
        data: {
          latestRespBaseSeconds: 7200,
          latestRespawnRandomness: 20,
          updatedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "Test Boss", world: "test-world" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].latestRespBaseSeconds).toBe(7200);
      expect(response.body[0].latestRespawnRandomness).toBe(20);
    });

    it("should return 403 when user lacks LOOTLOG_READ permission", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITHOUT_ACCESS.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "Boss", world: "test-world" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.id)
        .expect(403);
    });

    it("should return 400 when missing required query parameters", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "Boss" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ world: "test-world" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(400);
    });

    it("should perform case-insensitive search", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      const member = await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const futureDate = new Date(Date.now() + 3600000);
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: "test-world",
          npcId: 123,
          createdById: member.id,
          minSpawnTime: new Date(),
          maxSpawnTime: futureDate,
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 10,
          npc: {
            id: 123,
            name: "Dragon King",
            location: "Castle",
            wt: 450,
            lvl: 230,
            type: "ELITE2",
            prof: "w",
            icon: "dragon.png",
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild1.id}/timers/npcs/search`)
        .query({ search: "dragon", world: "test-world" })
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Dragon King");
    });
  });
});
