import type { INestApplication } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/db/prisma.service.js";
import {
  createTestTimerPayload,
  TEST_GUILDS,
  TEST_USERS,
} from "./test-helpers.js";
import { createTestingModuleWithMocks } from "./test-module-helpers.js";
import { db as prismaDb } from "../src/prisma/db.js";
import { RedisService } from "@lootlog/nest-shared/redis";
import { buildTimerKey } from "../src/timers/utils/timer-key.js";
import { RoutingKey } from "../src/enum/routing-key.enum.js";
import {
  createMemberFixture,
  createTimerFixture,
  FORBIDDEN_AUTH,
  TEST_AUTH,
  TEST_NPC,
  TEST_WORLD,
  withAuth,
} from "./events-timers-e2e-helpers.js";

import { dateToTemporal, temporalToDate } from "../src/db/temporal.js";
import {
  insertDatabaseFixture,
  insertDatabaseFixtures,
} from "./database-fixtures.js";
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

async function truncateTimersState(
  prisma: PrismaService,
  attempt: number = 1,
): Promise<void> {
  try {
    await prisma.db
      .runtime()
      .execute(
        prisma.db.raw
          .sql`TRUNCATE TABLE "Guild", "Role", "Member", "Timer", "UserCharactersLootlogSettings" CASCADE`
          .affectedCount()
          .build(),
      );
  } catch (error) {
    if (
      attempt === 3 ||
      !(error instanceof Error) ||
      !error.message.includes("deadlock detected")
    ) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    await truncateTimersState(prisma, attempt + 1);
  }
}

describe("Timers E2E Tests (Whitelist)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let amqpConnection: AmqpConnection;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
    await app.listen(0);

    prisma = app.get<PrismaService>(PrismaService);
    redis = app.get<RedisService>(RedisService);
    amqpConnection = app.get<AmqpConnection>(AmqpConnection);
  });

  afterAll(async () => {
    if (prisma) {
    }
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  beforeEach(async () => {
    await truncateTimersState(prisma);
    const keys = (
      await Promise.all(
        ["timer", "perms", "guild", "user-lootlog-config", "event-wrapped"].map(
          (prefix) => redis.getClient().keys(`${prefix}:*`),
        ),
      )
    ).flat();
    if (keys.length > 0) {
      await redis.getClient().del(...keys);
    }
    vi.mocked(amqpConnection.publish).mockClear();
  });

  describe("POST /timers/auto", () => {
    it("should reject invalid auto timer payload", async () => {
      await request(app.getHttpServer())
        .post("/timers/auto")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createTestTimerPayload({ world: "" }))
        .expect(400);

      await expect(
        prisma.db.orm.public.Timer.aggregate((aggregate) => ({
          count: aggregate.count(),
        })).then(({ count }) => count),
      ).resolves.toBe(0);
    });

    it("should update an existing timer even when its minimum spawn time is still far in the future", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        auth: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.id,
          discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        },
        permissions: [Permission.LOOTLOG_TIMERS_WRITE],
      });
      await insertDatabaseFixture(prisma, "UserCharactersLootlogSettings", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "short-respawn-account",
          characterId: "short-respawn-character",
          catchingGuildIds: [guild.id],
        },
      });

      const timerPayload = createTestTimerPayload({
        accountId: "short-respawn-account",
        characterId: "short-respawn-character",
        respBaseSeconds: 24 * 60 * 60,
      });
      const timerKey = buildTimerKey(
        timerPayload.npc.id,
        timerPayload.npc.name,
      );
      const previousMinSpawnTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const previousMaxSpawnTime = new Date(Date.now() + 30 * 60 * 60 * 1000);

      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild.id,
          createdById: member.id,
          world: timerPayload.world,
          npcId: timerPayload.npc.id,
          timerKey,
          minSpawnTime: previousMinSpawnTime,
          maxSpawnTime: previousMaxSpawnTime,
          latestRespBaseSeconds: 24 * 60 * 60,
          latestRespawnRandomness: 10,
          wasReset: false,
          npc: timerPayload.npc,
        },
      });

      const response = await request(app.getHttpServer())
        .post("/timers/auto")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body.submittedGuilds).toEqual([
        {
          guildId: guild.id,
          guildName: guild.name,
        },
      ]);
      expect(response.body.rejectedGuilds).toEqual([]);

      const timers = await prisma.db.orm.public.Timer.where((row) =>
        row.guildId.eq(guild.id),
      )
        .where((row) => row.world.eq(timerPayload.world))
        .where((row) => row.timerKey.eq(timerKey))
        .all();

      expect(timers).toHaveLength(1);
      expect(temporalToDate(timers[0].minSpawnTime).getTime()).not.toBe(
        previousMinSpawnTime.getTime(),
      );
      expect(temporalToDate(timers[0].maxSpawnTime).getTime()).not.toBe(
        previousMaxSpawnTime.getTime(),
      );
      expect(temporalToDate(timers[0].updatedAt).getTime()).toBeGreaterThan(
        temporalToDate(timers[0].createdAt).getTime(),
      );
      expect(
        vi
          .mocked(amqpConnection.publish)
          .mock.calls.filter(
            (call) => call[1] === RoutingKey.GUILDS_TIMERS_UPDATE,
          ),
      ).toHaveLength(1);
    });

    it("should keep one timer when 50 users submit the same NPC to one whitelisted guild concurrently", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "auto-burst-role",
          guildId: guild.id,
          name: "Timer Writers",
          permissions: [Permission.LOOTLOG_TIMERS_WRITE],
        },
      });
      const users = Array.from({ length: 50 }, (_, index) => ({
        id: `auto-burst-user-${index + 1}`,
        discordId: `auto-burst-discord-${index + 1}`,
      }));

      await Promise.all(
        users.map((user, index) =>
          insertDatabaseFixture(prisma, "Member", {
            updatedAt: dateToTemporal(new Date()),
            ...{
              userId: user.discordId,
              guildId: guild.id,
              name: `Auto Burst Member ${index + 1}`,
              globalUserId: user.id,
              roles: { connect: { id: role.id } },
            },
          }),
        ),
      );
      await insertDatabaseFixtures(
        prisma,
        "UserCharactersLootlogSettings",
        users.map((user) => ({
          userId: user.discordId,
          accountId: "auto-burst-account",
          characterId: "auto-burst-character",
          catchingGuildIds: [guild.id],
        })),
      );

      const timerPayload = createTestTimerPayload({
        accountId: "auto-burst-account",
        characterId: "auto-burst-character",
      });
      const results = await Promise.allSettled(
        users.map((user) =>
          request(app.getHttpServer())
            .post("/timers/auto")
            .set("x-auth-discord-id", user.discordId)
            .set("x-auth-user-id", user.id)
            .send(timerPayload),
        ),
      );
      const responses = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const rejectedResults = results.filter(
        (result) => result.status === "rejected",
      );

      expect(
        rejectedResults.map((result) =>
          result.status === "rejected" ? result.reason : null,
        ),
      ).toEqual([]);
      expect(responses.every((response) => response.status === 201)).toBe(true);

      const timers = await prisma.db.orm.public.Timer.where((row) =>
        row.guildId.eq(guild.id),
      )
        .where((row) => row.world.eq(timerPayload.world))
        .where((row) =>
          row.timerKey.eq(
            buildTimerKey(timerPayload.npc.id, timerPayload.npc.name),
          ),
        )
        .all();

      expect(timers).toHaveLength(1);
      expect(
        vi
          .mocked(amqpConnection.publish)
          .mock.calls.filter(
            (call) => call[1] === RoutingKey.GUILDS_TIMERS_UPDATE,
          ),
      ).toHaveLength(1);
    });

    it("should let another request take over when the first burst owner fails before creating a timer", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "auto-takeover-role",
          guildId: guild.id,
          name: "Timer Writers",
          permissions: [Permission.LOOTLOG_TIMERS_WRITE],
        },
      });
      const users = Array.from({ length: 8 }, (_, index) => ({
        id: `auto-takeover-user-${index + 1}`,
        discordId: `auto-takeover-discord-${index + 1}`,
      }));

      await Promise.all(
        users.map((user, index) =>
          insertDatabaseFixture(prisma, "Member", {
            updatedAt: dateToTemporal(new Date()),
            ...{
              userId: user.discordId,
              guildId: guild.id,
              name: `Auto Takeover Member ${index + 1}`,
              globalUserId: user.id,
              roles: { connect: { id: role.id } },
            },
          }),
        ),
      );
      await insertDatabaseFixtures(
        prisma,
        "UserCharactersLootlogSettings",
        users.map((user) => ({
          userId: user.discordId,
          accountId: "auto-takeover-account",
          characterId: "auto-takeover-character",
          catchingGuildIds: [guild.id],
        })),
      );

      const timerCollection = prisma.db.orm.public.Timer;
      const originalWhere = timerCollection.where.bind(timerCollection);
      let failureInjected = false;
      const whereSpy = vi
        .spyOn(timerCollection, "where")
        .mockImplementation((predicate) => {
          const query = originalWhere(predicate);
          const originalUpsert = query.upsert.bind(query);
          vi.spyOn(query, "upsert").mockImplementation(async (options) => {
            if (!failureInjected) {
              failureInjected = true;
              throw new Error("Injected upsert failure");
            }
            return originalUpsert(options);
          });
          return query;
        });

      const timerPayload = createTestTimerPayload({
        accountId: "auto-takeover-account",
        characterId: "auto-takeover-character",
      });
      const responses = await Promise.all(
        users.map((user) =>
          request(app.getHttpServer())
            .post("/timers/auto")
            .set("x-auth-discord-id", user.discordId)
            .set("x-auth-user-id", user.id)
            .send(timerPayload),
        ),
      );
      whereSpy.mockRestore();

      expect(responses.some((response) => response.status === 201)).toBe(true);
      expect(
        responses.some(
          (response) =>
            response.status === 409 &&
            response.body.message === "TIMER_RACE_CONDITION",
        ),
      ).toBe(false);

      const timers = await prisma.db.orm.public.Timer.where((row) =>
        row.guildId.eq(guild.id),
      )
        .where((row) => row.world.eq(timerPayload.world))
        .where((row) =>
          row.timerKey.eq(
            buildTimerKey(timerPayload.npc.id, timerPayload.npc.name),
          ),
        )
        .all();

      expect(timers).toHaveLength(1);
      expect(
        vi
          .mocked(amqpConnection.publish)
          .mock.calls.filter(
            (call) => call[1] === RoutingKey.GUILDS_TIMERS_UPDATE,
          ),
      ).toHaveLength(1);
    });

    it("should submit one timer per whitelisted guild when 10 users submit the same NPC concurrently", async () => {
      const guilds = await Promise.all([
        insertDatabaseFixture(prisma, "Guild", {
          updatedAt: dateToTemporal(new Date()),
          ...TEST_GUILDS.GUILD_1,
        }),
        insertDatabaseFixture(prisma, "Guild", {
          updatedAt: dateToTemporal(new Date()),
          ...TEST_GUILDS.GUILD_2,
        }),
        insertDatabaseFixture(prisma, "Guild", {
          updatedAt: dateToTemporal(new Date()),
          ...{
            id: "guild-3",
            name: "Test Guild 3",
            icon: null,
            ownerId: "owner-3",
          },
        }),
      ]);
      const roles = await Promise.all(
        guilds.map((guild, index) =>
          insertDatabaseFixture(prisma, "Role", {
            updatedAt: dateToTemporal(new Date()),
            ...{
              id: `auto-role-${index + 1}`,
              guildId: guild.id,
              name: "Timer Writers",
              permissions: [Permission.LOOTLOG_TIMERS_WRITE],
            },
          }),
        ),
      );
      const users = Array.from({ length: 10 }, (_, index) => ({
        id: `auto-user-${index + 1}`,
        discordId: `auto-discord-${index + 1}`,
      }));

      await Promise.all(
        users.flatMap((user, userIndex) =>
          guilds.map((guild, guildIndex) =>
            insertDatabaseFixture(prisma, "Member", {
              updatedAt: dateToTemporal(new Date()),
              ...{
                userId: user.discordId,
                guildId: guild.id,
                name: `Auto Member ${userIndex + 1}-${guildIndex + 1}`,
                globalUserId: user.id,
                roles: { connect: { id: roles[guildIndex].id } },
              },
            }),
          ),
        ),
      );
      await insertDatabaseFixtures(
        prisma,
        "UserCharactersLootlogSettings",
        users.map((user) => ({
          userId: user.discordId,
          accountId: "auto-account",
          characterId: "auto-character",
          catchingGuildIds: guilds.map((guild) => guild.id),
        })),
      );

      const timerPayload = createTestTimerPayload({
        accountId: "auto-account",
        characterId: "auto-character",
      });
      const responses = await Promise.all(
        users.map((user) =>
          request(app.getHttpServer())
            .post("/timers/auto")
            .set("x-auth-discord-id", user.discordId)
            .set("x-auth-user-id", user.id)
            .send(timerPayload),
        ),
      );

      expect(
        responses.every((response) => [201, 400].includes(response.status)),
      ).toBe(true);
      expect(responses.some((response) => response.status === 201)).toBe(true);

      const timers = await prisma.db.orm.public.Timer.where((row) =>
        row.world.eq(timerPayload.world),
      )
        .where((row) =>
          row.timerKey.eq(
            buildTimerKey(timerPayload.npc.id, timerPayload.npc.name),
          ),
        )
        .all();

      expect(timers).toHaveLength(guilds.length);
      expect(new Set(timers.map((timer) => timer.guildId))).toEqual(
        new Set(guilds.map((guild) => guild.id)),
      );
    });

    it("should reject auto timer and write nothing when user has no timer write guilds", async () => {
      await request(app.getHttpServer())
        .post("/timers/auto")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.id)
        .send(createTestTimerPayload())
        .expect(403);

      await expect(
        prisma.db.orm.public.Timer.aggregate((aggregate) => ({
          count: aggregate.count(),
        })).then(({ count }) => count),
      ).resolves.toBe(0);
    });
  });

  describe("GET /guilds/:guildId/timers (with cache)", () => {
    it("should return 403 when user lacks LOOTLOG_TIMERS_READ permission", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        auth: FORBIDDEN_AUTH,
        permissions: [],
      });

      await withAuth(
        request(app.getHttpServer()).get(`/guilds/${guild.id}/timers`),
        FORBIDDEN_AUTH,
      ).expect(403);
    });

    it("should cache timer list", async () => {
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      const member = await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "test-world",
          npcId: 1,
          timerKey: buildTimerKey(1, "Boss"),
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
            lvl: 100,
            type: "ELITE2",
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

  describe("GET /timers", () => {
    it("should return timers from all guilds accessible to the user", async () => {
      const guilds = await Promise.all([
        insertDatabaseFixture(prisma, "Guild", {
          updatedAt: dateToTemporal(new Date()),
          ...TEST_GUILDS.GUILD_1,
        }),
        insertDatabaseFixture(prisma, "Guild", {
          updatedAt: dateToTemporal(new Date()),
          ...TEST_GUILDS.GUILD_2,
        }),
      ]);
      const fixtures = await Promise.all(
        guilds.map((guild, index) =>
          createMemberFixture(prisma, {
            guildId: guild.id,
            auth: TEST_AUTH,
            roleId: `global-timer-role-${index}`,
            permissions: [Permission.LOOTLOG_TIMERS_READ],
          }),
        ),
      );

      await Promise.all(
        guilds.map((guild, index) =>
          createTimerFixture(prisma, {
            guildId: guild.id,
            memberId: fixtures[index].member.id,
            world: TEST_WORLD,
            npc: { ...TEST_NPC, id: TEST_NPC.id + index },
          }),
        ),
      );

      const response = await withAuth(
        request(app.getHttpServer())
          .get("/timers")
          .query({ world: TEST_WORLD }),
      ).expect(200);

      expect(response.body).toHaveLength(2);
      expect(
        new Set(
          response.body.map((timer: { guildId: string }) => timer.guildId),
        ),
      ).toEqual(new Set(guilds.map((guild) => guild.id)));
    });
  });

  describe("POST /guilds/:guildId/timers/manual", () => {
    it("should create a manual timer", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_TIMERS_WRITE],
      });

      const response = await withAuth(
        request(app.getHttpServer())
          .post(`/guilds/${guild.id}/timers/manual`)
          .send({
            name: "Manual Boss",
            minSeconds: 60,
            maxSeconds: 120,
            world: TEST_WORLD,
          }),
      ).expect(201);

      expect(response.body.guildId).toBe(guild.id);
      expect(response.body.npc.name).toBe("Manual Boss");
      await expect(
        prisma.db.orm.public.Timer.where((row) => row.guildId.eq(guild.id))
          .where((row) => row.createdById.eq(member.id))
          .aggregate((aggregate) => ({ count: aggregate.count() }))
          .then(({ count }) => count),
      ).resolves.toBe(1);
    });

    it("should reject invalid manual timer payload", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_TIMERS_WRITE],
      });

      await withAuth(
        request(app.getHttpServer())
          .post(`/guilds/${guild.id}/timers/manual`)
          .send({ name: "", world: TEST_WORLD }),
      ).expect(400);
    });

    it("should return 403 when user lacks LOOTLOG_TIMERS_WRITE permission", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        auth: FORBIDDEN_AUTH,
        permissions: [Permission.LOOTLOG_TIMERS_READ],
      });

      await withAuth(
        request(app.getHttpServer())
          .post(`/guilds/${guild.id}/timers/manual`)
          .send({ name: "Manual Boss", minSeconds: 60, world: TEST_WORLD }),
        FORBIDDEN_AUTH,
      ).expect(403);
    });
  });

  describe("PATCH /guilds/:guildId/timers/:timerIdentifier/reset", () => {
    it("should reset an existing timer by timer key", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_TIMERS_RESET],
      });
      const timer = await createTimerFixture(prisma, {
        guildId: guild.id,
        memberId: member.id,
        world: TEST_WORLD,
        minSpawnTime: new Date(Date.now() + 600_000),
        maxSpawnTime: new Date(Date.now() + 900_000),
      });

      const response = await withAuth(
        request(app.getHttpServer())
          .patch(
            `/guilds/${guild.id}/timers/${encodeURIComponent(timer.timerKey)}/reset`,
          )
          .send({ world: TEST_WORLD }),
      ).expect(200);

      expect(response.body.wasReset).toBe(true);
      const updated = await prisma.db.orm.public.Timer.where((row) =>
        row.guildId.eq(guild.id),
      )
        .where((row) => row.world.eq(TEST_WORLD))
        .where((row) => row.timerKey.eq(timer.timerKey))
        .first();
      expect(updated?.wasReset).toBe(true);
    });

    it("should reject reset without world", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_TIMERS_RESET],
      });
      const timer = await createTimerFixture(prisma, {
        guildId: guild.id,
        memberId: member.id,
      });

      await withAuth(
        request(app.getHttpServer())
          .patch(
            `/guilds/${guild.id}/timers/${encodeURIComponent(timer.timerKey)}/reset`,
          )
          .send({}),
      ).expect(400);
    });

    it("should return 404 for syntactically valid but missing timer", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_TIMERS_RESET],
      });
      const missingTimerKey = buildTimerKey(999_999, "Missing Timer");

      const response = await withAuth(
        request(app.getHttpServer())
          .patch(
            `/guilds/${guild.id}/timers/${encodeURIComponent(missingTimerKey)}/reset`,
          )
          .send({ world: TEST_WORLD }),
      ).expect(404);

      expect(response.body.message).toBe("TIMER_NOT_FOUND");
    });

    it("should return 404 for missing non-numeric timer key", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_TIMERS_RESET],
      });

      const response = await withAuth(
        request(app.getHttpServer())
          .patch(`/guilds/${guild.id}/timers/missing:timer/reset`)
          .send({ world: TEST_WORLD }),
      ).expect(404);

      expect(response.body.message).toBe("TIMER_NOT_FOUND");
    });

    it("should return 403 when user lacks LOOTLOG_TIMERS_RESET permission", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        auth: FORBIDDEN_AUTH,
        permissions: [Permission.LOOTLOG_TIMERS_READ],
      });
      const timer = await createTimerFixture(prisma, {
        guildId: guild.id,
        memberId: member.id,
      });

      await withAuth(
        request(app.getHttpServer())
          .patch(
            `/guilds/${guild.id}/timers/${encodeURIComponent(timer.timerKey)}/reset`,
          )
          .send({ world: TEST_WORLD }),
        FORBIDDEN_AUTH,
      ).expect(403);
    });
  });

  describe("DELETE /guilds/:guildId/timers/:timerIdentifier", () => {
    it("should delete an existing timer", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [
          Permission.LOOTLOG_MANAGE,
          Permission.LOOTLOG_TIMERS_READ,
        ],
      });
      const timer = await createTimerFixture(prisma, {
        guildId: guild.id,
        memberId: member.id,
      });

      await withAuth(
        request(app.getHttpServer())
          .delete(
            `/guilds/${guild.id}/timers/${encodeURIComponent(timer.timerKey)}`,
          )
          .query({ world: TEST_WORLD }),
      ).expect(200);

      const deletedTimer = await prisma.db.orm.public.Timer.where((row) =>
        row.guildId.eq(guild.id),
      )
        .where((row) => row.world.eq(TEST_WORLD))
        .where((row) => row.timerKey.eq(timer.timerKey))
        .first();
      expect(deletedTimer).not.toBeNull();
      expect(temporalToDate(deletedTimer!.deletedAt)).toBeInstanceOf(Date);

      const response = await withAuth(
        request(app.getHttpServer())
          .get(`/guilds/${guild.id}/timers`)
          .query({ world: TEST_WORLD }),
      ).expect(200);

      expect(response.body).toEqual([]);
    });

    it("should return 404 for syntactically valid but missing timer", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_MANAGE],
      });
      const missingTimerKey = buildTimerKey(999_999, "Missing Timer");

      const response = await withAuth(
        request(app.getHttpServer())
          .delete(
            `/guilds/${guild.id}/timers/${encodeURIComponent(missingTimerKey)}`,
          )
          .query({ world: TEST_WORLD }),
      ).expect(404);

      expect(response.body.message).toBe("TIMER_NOT_FOUND");
    });

    it("should return 404 for missing non-numeric timer key", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      await createMemberFixture(prisma, {
        guildId: guild.id,
        permissions: [Permission.LOOTLOG_MANAGE],
      });

      const response = await withAuth(
        request(app.getHttpServer())
          .delete(`/guilds/${guild.id}/timers/missing:timer`)
          .query({ world: TEST_WORLD }),
      ).expect(404);

      expect(response.body.message).toBe("TIMER_NOT_FOUND");
    });

    it("should return 403 when user lacks LOOTLOG_MANAGE permission", async () => {
      const guild = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });
      const { member } = await createMemberFixture(prisma, {
        guildId: guild.id,
        auth: FORBIDDEN_AUTH,
        permissions: [Permission.LOOTLOG_TIMERS_READ],
      });
      const timer = await createTimerFixture(prisma, {
        guildId: guild.id,
        memberId: member.id,
      });

      await withAuth(
        request(app.getHttpServer())
          .delete(
            `/guilds/${guild.id}/timers/${encodeURIComponent(timer.timerKey)}`,
          )
          .query({ world: TEST_WORLD }),
        FORBIDDEN_AUTH,
      ).expect(403);
    });
  });

  describe("GET /guilds/:guildId/timers/npcs/search", () => {
    it("should search NPCs with timer data", async () => {
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      const member = await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "test-world",
          npcId: 123,
          timerKey: buildTimerKey(123, "Smok Lodowy"),
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

      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "test-world",
          npcId: 124,
          timerKey: buildTimerKey(124, "Smok Ciemnosci"),
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
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      const member = await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "world-1",
          npcId: 123,
          timerKey: buildTimerKey(123, "Boss"),
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

      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "world-2",
          npcId: 124,
          timerKey: buildTimerKey(124, "Boss"),
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
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      const member = await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
        await insertDatabaseFixture(prisma, "Timer", {
          updatedAt: dateToTemporal(new Date()),
          ...{
            guildId: guild1.id,
            world: "test-world",
            npcId: 100 + i,
            timerKey: buildTimerKey(100 + i, `Test NPC ${i}`),
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
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      const member = await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "test-world",
          npcId: 999,
          timerKey: buildTimerKey(999, "Test Boss"),
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

      await prisma.db.orm.public.Timer.where((row) => row.guildId.eq(guild1.id))
        .where((row) => row.world.eq("test-world"))
        .where((row) => row.timerKey.eq(buildTimerKey(999, "Test Boss")))
        .update({
          latestRespBaseSeconds: 7200,
          latestRespawnRandomness: 20,
          updatedAt: dateToTemporal(new Date()),
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

    it("should return 403 when user lacks LOOTLOG_TIMERS_READ permission", async () => {
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [],
        },
      });

      await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      const guild1 = await insertDatabaseFixture(prisma, "Guild", {
        updatedAt: dateToTemporal(new Date()),
        ...TEST_GUILDS.GUILD_1,
      });

      const role = await insertDatabaseFixture(prisma, "Role", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      });

      const member = await insertDatabaseFixture(prisma, "Member", {
        updatedAt: dateToTemporal(new Date()),
        ...{
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
      await insertDatabaseFixture(prisma, "Timer", {
        updatedAt: dateToTemporal(new Date()),
        ...{
          guildId: guild1.id,
          world: "test-world",
          npcId: 123,
          timerKey: buildTimerKey(123, "Dragon King"),
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
