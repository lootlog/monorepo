import type { INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/db/prisma.service.js";
import {
  createTestLootPayload,
  TEST_GUILDS,
  TEST_USERS,
} from "./test-helpers.js";
import { createTestingModuleWithMocks } from "./test-module-helpers.js";
import {
  LootShareSource,
  Permission,
  NpcType,
  ItemRarity,
} from "../src/db/domain.js";

describe("Loots E2E Tests (Whitelist)", () => {
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
    await app.listen(0);

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
    await Promise.all([
      prisma.$executeRaw`TRUNCATE TABLE "Guild", "Role", "Member", "Loot", "LootSubmission", "UserCharactersLootlogSettings", "LootlogConfig" CASCADE`,
      redis.getClient().flushall(),
    ]);
  });

  const createLootWriter = async (npcType: NpcType) => {
    const guild = await prisma.guild.create({
      data: TEST_GUILDS.GUILD_1,
    });
    const role = await prisma.role.create({
      data: {
        id: "role-loot-writer",
        guildId: guild.id,
        name: "Loot writer",
        permissions: [Permission.LOOTLOG_LOOTS_WRITE],
      },
    });

    await prisma.member.create({
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
    await prisma.userCharactersLootlogSettings.create({
      data: {
        userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        accountId: "12345",
        characterId: "1",
        catchingGuildIds: [guild.id],
      },
    });
    await prisma.lootlogConfig.create({
      data: {
        id: guild.id,
        npcs: {
          create: [
            {
              npcType,
              allowedRarities: [ItemRarity.UNIQUE],
            },
          ],
        },
      },
    });

    return guild;
  };

  describe("POST /loots", () => {
    it("should create loot for guilds in whitelist", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const _guild2 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
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
                npcType: NpcType.HERO,
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

      const lootSubmissions = await prisma.lootSubmission.findMany({
        include: { organizationLootRecord: true },
      });
      expect(lootSubmissions).toHaveLength(1);
      expect(lootSubmissions[0].organizationLootRecord.guildId).toBe(guild1.id);
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
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        },
      });

      const role2 = await prisma.role.create({
        data: {
          id: "role-2",
          guildId: guild2.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
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
                npcType: NpcType.HERO,
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
                npcType: NpcType.HERO,
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
        id: response.body.id,
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

      const lootSubmissions = await prisma.lootSubmission.findMany({
        include: { organizationLootRecord: true },
      });
      expect(lootSubmissions).toHaveLength(1);
      expect(lootSubmissions[0].organizationLootRecord.guildId).toBe(guild1.id);
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
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
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
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
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

    it("should return 403 when user has no LOOTLOG_LOOTS_WRITE permission", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild1.id,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_READ],
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
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
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
                npcType: NpcType.HERO,
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

  describe("automatic colossus loot share", () => {
    it("should persist item ownership for a standard colossus", async () => {
      await createLootWriter(NpcType.COLOSSUS);
      const lootPayload = createTestLootPayload({
        loots: [
          {
            hid: "standard-colossus-item",
            name: "Standard Colossus Item",
            icon: "standard-item.gif",
            pr: 3,
            prc: "unique",
            stat: "lvl=279;rarity=UNIQUE",
            id: 10_001,
            cl: 16,
            own: 3001,
          },
        ],
        npcs: [
          {
            id: 910_001,
            name: "E2E Standard Colossus",
            location: "Test Location",
            lvl: 279,
            prof: "b",
            wt: 90,
            icon: "kol/e2e-standard.gif",
            type: 2,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(201);

      const persistedLoot = await prisma.loot.findUniqueOrThrow({
        where: { id: response.body.id },
        select: { lootShare: true, lootShareSource: true },
      });
      expect(persistedLoot.lootShare).toEqual({
        "300112345": ["standard-colossus-item"],
      });
      expect(persistedLoot.lootShareSource).toBe(LootShareSource.ITEM_OWNER);
    });

    it("should keep loot share empty for a same-name non-colossus variant", async () => {
      await createLootWriter(NpcType.COLOSSUS);
      await prisma.npcSnapshot.create({
        data: {
          npcId: 920_001,
          name: "E2E Promoted Event Hero",
          type: NpcType.HERO,
          lvl: 268,
          wt: 81,
          margonemType: 2,
        },
      });
      const lootPayload = createTestLootPayload({
        loots: [
          {
            hid: "event-colossus-item",
            name: "Event Colossus Item",
            icon: "event-item.gif",
            pr: 3,
            prc: "unique",
            stat: "lvl=268;rarity=UNIQUE",
            id: 10_002,
            cl: 16,
            own: 3001,
          },
        ],
        npcs: [
          {
            id: 920_002,
            name: "E2E Promoted Event Hero",
            location: "Test Location",
            lvl: 268,
            prof: "w",
            wt: 91,
            icon: "her/e2e-promoted.gif",
            type: 2,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(201);

      const persistedLoot = await prisma.loot.findUniqueOrThrow({
        where: { id: response.body.id },
        select: { lootShare: true, lootShareSource: true },
      });
      expect(persistedLoot.lootShare).toEqual({});
      expect(persistedLoot.lootShareSource).toBe(LootShareSource.NONE);
    });
  });

  describe("PATCH /loots/:id", () => {
    it("should acknowledge an identical repeated update without returning the stored share", async () => {
      await createLootWriter(NpcType.HERO);
      const createResponse = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(
          createTestLootPayload({
            loots: [
              {
                hid: "abc123",
                name: "Test Item",
                icon: "test-item.gif",
                pr: 3,
                prc: "unique",
                stat: "lvl=100;rarity=UNIQUE",
                id: 1001,
                cl: 16,
              },
            ],
          }),
        )
        .expect(201);
      const updatePayload = {
        msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
      };
      const expectedLootShare = {
        "300112345": ["abc123"],
      };

      const firstResponse = await request(app.getHttpServer())
        .patch(`/loots/${createResponse.body.id}`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(updatePayload)
        .expect(200);
      const secondResponse = await request(app.getHttpServer())
        .patch(`/loots/${createResponse.body.id}`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(updatePayload)
        .expect(200);

      expect(firstResponse.body).toEqual({});
      expect(secondResponse.body).toEqual({});
      const persistedLoot = await prisma.loot.findUniqueOrThrow({
        where: { id: createResponse.body.id },
        select: { lootShare: true, lootShareSource: true },
      });
      expect(persistedLoot.lootShare).toEqual(expectedLootShare);
      expect(persistedLoot.lootShareSource).toBe(LootShareSource.CHAT_MESSAGE);
    });

    it("should replace an inferred owner share with the chat allocation", async () => {
      await createLootWriter(NpcType.COLOSSUS);
      const createResponse = await request(app.getHttpServer())
        .post("/loots")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(
          createTestLootPayload({
            loots: [
              {
                hid: "aa11",
                name: "First Item",
                icon: "first-item.gif",
                pr: 3,
                prc: "unique",
                stat: "lvl=100;rarity=UNIQUE",
                id: 1001,
                cl: 16,
                own: 3001,
              },
              {
                hid: "bb22",
                name: "Second Item",
                icon: "second-item.gif",
                pr: 3,
                prc: "unique",
                stat: "lvl=100;rarity=UNIQUE",
                id: 1002,
                cl: 16,
                own: 3002,
              },
            ],
            npcs: [
              {
                id: 930_001,
                name: "E2E Inferred Colossus",
                location: "Test Location",
                lvl: 200,
                prof: "w",
                wt: 90,
                icon: "kol/e2e-inferred.gif",
                type: 2,
              },
            ],
            players: [
              {
                id: 3001,
                accountId: 12_345,
                name: "First Player",
                lvl: 100,
                prof: "w",
                icon: "first-player.gif",
              },
              {
                id: 3002,
                accountId: 23_456,
                name: "Second Player",
                lvl: 100,
                prof: "m",
                icon: "second-player.gif",
              },
            ],
          }),
        )
        .expect(201);

      const inferredLoot = await prisma.loot.findUniqueOrThrow({
        where: { id: createResponse.body.id },
        select: { lootShare: true, lootShareSource: true },
      });
      expect(inferredLoot).toEqual({
        lootShare: {
          "300112345": ["aa11"],
          "300223456": ["bb22"],
        },
        lootShareSource: LootShareSource.ITEM_OWNER,
      });

      const updateResponse = await request(app.getHttpServer())
        .patch(`/loots/${createResponse.body.id}`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send({
          msg: [
            'First Player otrzymał ITEM#bb22:"Second Item"',
            'Second Player otrzymał ITEM#aa11:"First Item"',
          ].join("\n"),
        })
        .expect(200);
      expect(updateResponse.body).toEqual({});

      const confirmedLoot = await prisma.loot.findUniqueOrThrow({
        where: { id: createResponse.body.id },
        select: { lootShare: true, lootShareSource: true },
      });
      expect(confirmedLoot).toEqual({
        lootShare: {
          "300112345": ["bb22"],
          "300223456": ["aa11"],
        },
        lootShareSource: LootShareSource.CHAT_MESSAGE,
      });
    });
  });
});
