import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { TEST_GUILDS, TEST_USERS } from "./test-helpers";
import { createTestingModuleWithMocks } from "./test-module-helpers";
import { Permission } from "src/db/domain";

describe("User Lootlog Config E2E Tests", () => {
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
      await prisma.onModuleDestroy();
    }
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  beforeEach(async () => {
    await prisma.execute(
      prisma.raw
        .sql`TRUNCATE TABLE "Guild", "Role", "Member", "UserCharactersLootlogSettings" CASCADE`
        .affectedCount()
        .build(),
    );
    const redisClient = redis.getClient();
    await redisClient.flushall();
  });

  describe("GET /users/@me/lootlog-config/accounts/:accountId", () => {
    it("should return empty object when no config exists", async () => {
      const guild = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toEqual({});
    });

    it("should return config for account with single character", async () => {
      const guild = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.orm.public.UserCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [guild.id],
        },
      });

      const response = await request(app.getHttpServer())
        .get("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveProperty("1");
      expect(response.body["1"]).toMatchObject({
        userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        accountId: "12345",
        characterId: "1",
        catchingGuildIds: [guild.id],
      });
    });

    it("should return config for account with multiple characters", async () => {
      const guild = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.orm.public.UserCharactersLootlogSettings.createMany({
        data: [
          {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "12345",
            characterId: "1",
            catchingGuildIds: [guild.id],
          },
          {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "12345",
            characterId: "2",
            catchingGuildIds: [guild.id],
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body).toHaveProperty("1");
      expect(response.body).toHaveProperty("2");
      expect(response.body["1"].catchingGuildIds).toEqual([guild.id]);
      expect(response.body["2"].catchingGuildIds).toEqual([guild.id]);
    });

    it("should filter out guilds where user has no LOOTLOG_LOOTS_WRITE permission", async () => {
      const guild1 = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const roleWithWrite = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Admin",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      const roleWithoutWrite = await prisma.orm.public.Role.create({
        data: {
          id: "role-2",
          guildId: guild2.id,
          name: "Viewer",
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: roleWithWrite.id },
          },
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild2.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: roleWithoutWrite.id },
          },
        },
      });

      await prisma.orm.public.UserCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [guild1.id, guild2.id],
        },
      });

      const response = await request(app.getHttpServer())
        .get("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body["1"].catchingGuildIds).toEqual([guild1.id]);
    });
  });

  describe("PUT /users/@me/lootlog-config/accounts/:accountId", () => {
    it("should create new config for character", async () => {
      const guild = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const payload = {
        characterId: "1",
        catchingGuildIds: [guild.id],
      };

      const response = await request(app.getHttpServer())
        .put("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(payload)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        accountId: "12345",
        characterId: "1",
        catchingGuildIds: [guild.id],
      });

      const dbConfig =
        await prisma.orm.public.UserCharactersLootlogSettings.findFirst({
          where: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "12345",
            characterId: "1",
          },
        });

      expect(dbConfig).toBeTruthy();
      expect(dbConfig?.catchingGuildIds).toEqual([guild.id]);
    });

    it("should update existing config for character", async () => {
      const guild1 = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const role1 = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      const role2 = await prisma.orm.public.Role.create({
        data: {
          id: "role-2",
          guildId: guild2.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      await prisma.orm.public.Member.createMany({
        data: [
          {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            guildId: guild1.id,
            name: "Test Member",
            globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          },
          {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            guildId: guild2.id,
            name: "Test Member",
            globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          },
        ],
      });

      await prisma.orm.public.Member.update({
        where: {
          memberId: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            guildId: guild1.id,
          },
        },
        data: {
          roles: {
            connect: { id: role1.id },
          },
        },
      });

      await prisma.orm.public.Member.update({
        where: {
          memberId: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            guildId: guild2.id,
          },
        },
        data: {
          roles: {
            connect: { id: role2.id },
          },
        },
      });

      await prisma.orm.public.UserCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [guild1.id],
        },
      });

      const payload = {
        characterId: "1",
        catchingGuildIds: [guild1.id, guild2.id],
      };

      const response = await request(app.getHttpServer())
        .put("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(payload)
        .expect(200);

      expect(response.body.catchingGuildIds).toEqual([guild1.id, guild2.id]);
    });

    it("should filter out guilds without write access during write", async () => {
      const guild1 = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const roleWithWrite = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Admin",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      const roleWithoutWrite = await prisma.orm.public.Role.create({
        data: {
          id: "role-2",
          guildId: guild2.id,
          name: "Viewer",
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: roleWithWrite.id },
          },
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild2.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: roleWithoutWrite.id },
          },
        },
      });

      const payload = {
        characterId: "1",
        catchingGuildIds: [guild1.id, guild2.id],
      };

      const response = await request(app.getHttpServer())
        .put("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(payload)
        .expect(200);

      expect(response.body.catchingGuildIds).toEqual([guild1.id]);
    });

    it("should return 400 when characterId is missing", async () => {
      const payload = {
        catchingGuildIds: [],
      };

      await request(app.getHttpServer())
        .put("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(payload)
        .expect(400);
    });

    it("should return 400 when catchingGuildIds is not an array", async () => {
      const payload = {
        characterId: "1",
        catchingGuildIds: "not-an-array",
      };

      await request(app.getHttpServer())
        .put("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(payload)
        .expect(400);
    });

    it("should accept empty arrays for guild IDs", async () => {
      const guild = await prisma.orm.public.Guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.orm.public.Role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      await prisma.orm.public.Member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const payload = {
        characterId: "1",
        catchingGuildIds: [],
      };

      const response = await request(app.getHttpServer())
        .put("/users/@me/lootlog-config/accounts/12345")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(payload)
        .expect(200);

      expect(response.body.catchingGuildIds).toEqual([]);
    });
  });
});
