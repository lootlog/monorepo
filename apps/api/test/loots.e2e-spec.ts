import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/db/prisma.service";
import { createTestLootPayload, TEST_GUILDS, TEST_USERS } from "./test-helpers";
import { createTestingModuleWithMocks } from "./test-module-helpers";
import { Permission, NpcType, ItemRarity } from "generated/client";

describe("Loots E2E Tests (Whitelist)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
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
    await prisma.$executeRaw`TRUNCATE TABLE "Guild", "Role", "Member", "Loot", "LootSubmission", "UserCharactersLootlogSettings", "LootlogConfig" CASCADE`;
  });

  describe("POST /loots", () => {
    it("should create loot for guilds in whitelist", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_2,
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

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [guild1.id],
        },
      });

      await prisma.lootlogConfig.create({
        data: {
          id: guild1.id,
          npcs: {
            create: [
              {
                npcType: NpcType.ELITE2,
                allowedRarities: [ItemRarity.UNIQUE],
              },
            ],
          },
        },
      });

      const lootPayload = createTestLootPayload();

      const response = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.id).toBe(1);
      expect(response.body.submittedGuilds).toEqual([
        {
          guildId: guild1.id,
          guildName: guild1.name,
        },
      ]);
      expect(response.body.rejectedGuilds).toEqual([]);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(1);
      expect(lootSubmissions[0].guildId).toBe(guild1.id);
    });

    it("should not create loot for guilds not in whitelist", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const role1 = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      const role2 = await prisma.role.create({
        data: {
          id: "role-2",
          guildId: guild2.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: "Test Member 1",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role1.id },
          },
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild2.id,
          name: "Test Member 2",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role2.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [guild1.id],
        },
      });

      await prisma.lootlogConfig.create({
        data: {
          id: guild1.id,
          npcs: {
            create: [
              {
                npcType: NpcType.ELITE2,
                allowedRarities: [ItemRarity.UNIQUE],
              },
            ],
          },
        },
      });

      await prisma.lootlogConfig.create({
        data: {
          id: guild2.id,
          npcs: {
            create: [
              {
                npcType: NpcType.ELITE2,
                allowedRarities: [ItemRarity.UNIQUE],
              },
            ],
          },
        },
      });

      const lootPayload = createTestLootPayload();

      const response = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(201);

      expect(response.body).toEqual({
        id: 1,
        submittedGuilds: [
          {
            guildId: guild1.id,
            guildName: guild1.name,
          },
        ],
        rejectedGuilds: [
          {
            guildId: guild2.id,
            guildName: guild2.name,
            reason: "NOT_ON_CHARACTER_WHITELIST",
          },
        ],
      });

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(1);
      expect(lootSubmissions[0].guildId).toBe(guild1.id);
    });

    it("should not create any loot when whitelist is empty", async () => {
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

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [],
        },
      });

      const lootPayload = createTestLootPayload();

      const response = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(400);

      expect(response.body).toEqual({
        message: "NO_GUILDS_ON_THE_CHARACTER_WHITELIST",
        submittedGuilds: [],
        rejectedGuilds: [
          {
            guildId: guild1.id,
            guildName: guild1.name,
            reason: "NOT_ON_CHARACTER_WHITELIST",
          },
        ],
      });

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(0);
    });

    it("should not create loot when no whitelist config exists", async () => {
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

      const lootPayload = createTestLootPayload();

      const response = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(400);

      expect(response.body).toEqual({
        message: "NO_GUILDS_ON_THE_CHARACTER_WHITELIST",
        submittedGuilds: [],
        rejectedGuilds: [
          {
            guildId: guild1.id,
            guildName: guild1.name,
            reason: "NOT_ON_CHARACTER_WHITELIST",
          },
        ],
      });

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(0);
    });

    it("should return 403 when user has no LOOTLOG_WRITE permission", async () => {
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

      const lootPayload = createTestLootPayload();

      await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITHOUT_ACCESS.id)
        .send(lootPayload)
        .expect(403);
    });

    it("should handle 10 concurrent requests with distributed locking", async () => {
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

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "12345",
          characterId: "1",
          catchingGuildIds: [guild1.id],
        },
      });

      await prisma.lootlogConfig.create({
        data: {
          id: guild1.id,
          npcs: {
            create: [
              {
                npcType: NpcType.ELITE2,
                allowedRarities: [ItemRarity.UNIQUE],
              },
            ],
          },
        },
      });

      const lootPayload = createTestLootPayload();

      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post("/loots")
            .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
            .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
            .send(lootPayload),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          id: responses[0].body.id,
          submittedGuilds: [
            {
              guildId: guild1.id,
              guildName: guild1.name,
            },
          ],
          rejectedGuilds: [],
        });
      });

      const allSameId = responses.every(
        (r) => r.body.id === responses[0].body.id,
      );
      expect(allSameId).toBe(true);

      const lootCount = await prisma.loot.count();
      expect(lootCount).toBe(1);

      const submissionsCount = await prisma.lootSubmission.count();
      expect(submissionsCount).toBe(1);
    });
  });
});
