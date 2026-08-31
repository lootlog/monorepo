import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/db/prisma.service.js";
import { RedisService } from "@lootlog/nest-shared/redis";
import { TEST_GUILDS, TEST_USERS } from "./test-helpers.js";
import { createTestingModuleWithMocks } from "./test-module-helpers.js";
import { db as prismaDb } from "../src/prisma/db.js";
import type { Contract } from "../src/prisma/contract.js";
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];

const TEST_USERS_EXTENDED = {
  ...TEST_USERS,
  MEMBER_2: {
    id: "user-789",
    email: "test3@example.com",
    discordId: "discord-789",
    role: "USER",
  },
  MEMBER_3: {
    id: "user-101",
    email: "test4@example.com",
    discordId: "discord-101",
    role: "USER",
  },
} as const;

function createTestKillPayload(overrides = {}) {
  return {
    world: "pandora",
    npc: {
      id: -12345,
      name: "Test Boss",
      lvl: 300,
      prof: "w",
      wt: 85, // HERO type
      icon: "boss.gif",
    },
    characterId: "67890",
    accountId: "11111",
    ...overrides,
  };
}

function createKillRole(
  prisma: PrismaService,
  guildId: string,
  id: string,
  permissions: Permission[] = [Permission.LOOTLOG_LOOTS_WRITE],
) {
  return prisma.role.create({
    data: {
      id,
      guildId,
      name: id,
      permissions,
    },
  });
}

function createKillMember(
  prisma: PrismaService,
  options: {
    guildId: string;
    discordId: string;
    globalUserId: string;
    name: string;
    roleId: string;
  },
) {
  return prisma.member.create({
    data: {
      userId: options.discordId,
      guildId: options.guildId,
      name: options.name,
      globalUserId: options.globalUserId,
      roles: {
        connect: { id: options.roleId },
      },
    },
  });
}

describe("Kills E2E Tests (Deduplication)", () => {
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
    // Clear database tables
    await prisma.$executeRaw`TRUNCATE TABLE "Guild", "Role", "Member", "UserKillStats", "NpcKillStats", "GuildKillSummary", "UserCharactersLootlogSettings" CASCADE`;

    await Promise.all([
      redis.deleteByPattern("kill:dedup:*"),
      redis.deleteByPattern("perms:*"),
      redis.deleteByPattern("guild:*"),
      redis.deleteByPattern("user-lootlog-config:*"),
    ]);
  });

  describe("POST /kills - User Deduplication", () => {
    it("should deduplicate multiple requests from same user for same NPC within 30s window", async () => {
      // Setup: Create guild and member
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Test Member",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      const killPayload = createTestKillPayload();

      // Send first request - should succeed
      const response1 = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(killPayload)
        .expect(201);

      expect(response1.body.updated).toBe(1);
      expect(response1.body.deduplicated).toBeUndefined();

      // Send second request immediately - should be deduplicated
      const response2 = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(killPayload)
        .expect(201);

      expect(response2.body.deduplicated).toBe(true);
      expect(response2.body.updated).toBe(0);

      // Verify only 1 kill was recorded in UserKillStats
      const userKills = await prisma.userKillStats.findMany({
        where: { userId: TEST_USERS.MEMBER_WITH_WRITE.discordId },
      });
      expect(userKills).toHaveLength(1);
      expect(userKills[0].totalKills).toBe(1);

      // Verify only 1 member participation in NpcKillStats
      const npcKills = await prisma.npcKillStats.findMany({
        where: { guildId: guild.id },
      });
      expect(npcKills).toHaveLength(1);
      expect(npcKills[0].memberKills).toBe(1);

      // Verify only 1 unique guild kill
      const guildSummary = await prisma.guildKillSummary.findMany({
        where: { guildId: guild.id },
      });
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(1);
    });

    it("should handle 10 concurrent requests from same user - only first counted", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Test Member",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      const killPayload = createTestKillPayload();

      // Send 10 concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post("/kills")
            .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
            .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
            .send(killPayload),
        );

      const responses = await Promise.all(requests);

      // All should return 201
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Only one should have updated > 0
      const successfulUpdates = responses.filter(
        (r) => r.body.updated > 0 && !r.body.deduplicated,
      );
      expect(successfulUpdates).toHaveLength(1);

      // Rest should be deduplicated
      const deduplicatedResponses = responses.filter(
        (r) => r.body.deduplicated === true,
      );
      expect(deduplicatedResponses).toHaveLength(9);

      // Verify database state
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(1);
      expect(userKills[0].totalKills).toBe(1);

      const npcKills = await prisma.npcKillStats.findMany();
      expect(npcKills).toHaveLength(1);
      expect(npcKills[0].memberKills).toBe(1);

      const guildSummary = await prisma.guildKillSummary.findMany();
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(1);
    });

    it("should allow same user to kill different NPCs", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Test Member",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      // Kill NPC 1
      const response1 = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(
          createTestKillPayload({
            npc: { ...createTestKillPayload().npc, id: -1001 },
          }),
        )
        .expect(201);

      expect(response1.body.updated).toBe(1);

      // Kill NPC 2 - different NPC, should not be deduplicated
      const response2 = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(
          createTestKillPayload({
            npc: { ...createTestKillPayload().npc, id: -1002 },
          }),
        )
        .expect(201);

      expect(response2.body.updated).toBe(1);
      expect(response2.body.deduplicated).toBeUndefined();

      // Verify 2 different NPC kills recorded
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(2);

      const npcKills = await prisma.npcKillStats.findMany();
      expect(npcKills).toHaveLength(2);

      const guildSummary = await prisma.guildKillSummary.findMany();
      expect(guildSummary).toHaveLength(2);
    });
  });

  describe("POST /kills - Guild Deduplication (Multiple Members)", () => {
    it("should count participations for all members but only 1 unique guild kill", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      // Create 3 members
      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Member 1",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS_EXTENDED.MEMBER_2.discordId,
        name: "Member 2",
        globalUserId: TEST_USERS_EXTENDED.MEMBER_2.id,
        roleId: role.id,
      });

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS_EXTENDED.MEMBER_3.discordId,
        name: "Member 3",
        globalUserId: TEST_USERS_EXTENDED.MEMBER_3.id,
        roleId: role.id,
      });

      // Configure all members to report to the same guild
      await Promise.all([
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "11111",
            characterId: "1",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS_EXTENDED.MEMBER_2.discordId,
            accountId: "22222",
            characterId: "2",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS_EXTENDED.MEMBER_3.discordId,
            accountId: "33333",
            characterId: "3",
            catchingGuildIds: [guild.id],
          },
        }),
      ]);

      const killPayload = createTestKillPayload();

      // All 3 members kill the same NPC "simultaneously"
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send({ ...killPayload, accountId: "11111", characterId: "1" }),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS_EXTENDED.MEMBER_2.discordId)
          .set("x-auth-user-id", TEST_USERS_EXTENDED.MEMBER_2.id)
          .send({ ...killPayload, accountId: "22222", characterId: "2" }),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS_EXTENDED.MEMBER_3.discordId)
          .set("x-auth-user-id", TEST_USERS_EXTENDED.MEMBER_3.id)
          .send({ ...killPayload, accountId: "33333", characterId: "3" }),
      ]);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.updated).toBe(1);
      });

      // Each user should have their own UserKillStats
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(3);
      userKills.forEach((kill) => {
        expect(kill.totalKills).toBe(1);
      });

      // Each member should have their own participation (memberKills)
      const npcKills = await prisma.npcKillStats.findMany({
        where: { guildId: guild.id },
      });
      expect(npcKills).toHaveLength(3);

      // Total member participations = 3
      const totalParticipations = npcKills.reduce(
        (sum, k) => sum + k.memberKills,
        0,
      );
      expect(totalParticipations).toBe(3);

      // But only 1 unique guild kill
      const guildSummary = await prisma.guildKillSummary.findMany({
        where: { guildId: guild.id },
      });
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(1);
    });

    it("should handle 10 concurrent requests from different users - all get participation, 1 unique kill", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      // Create 10 different users/members
      const userIds = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${100 + i}`,
        discordId: `discord-${100 + i}`,
        accountId: `${10000 + i}`,
        characterId: `${i + 1}`,
      }));

      await Promise.all(
        userIds.map((user) =>
          createKillMember(prisma, {
            guildId: guild.id,
            discordId: user.discordId,
            name: `Member ${user.id}`,
            globalUserId: user.id,
            roleId: role.id,
          }),
        ),
      );

      await Promise.all(
        userIds.map((user) =>
          prisma.userCharactersLootlogSettings.create({
            data: {
              userId: user.discordId,
              accountId: user.accountId,
              characterId: user.characterId,
              catchingGuildIds: [guild.id],
            },
          }),
        ),
      );

      const killPayload = createTestKillPayload();

      // All 10 users send kill requests concurrently
      const requests = userIds.map((user) =>
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", user.discordId)
          .set("x-auth-user-id", user.id)
          .send({
            ...killPayload,
            accountId: user.accountId,
            characterId: user.characterId,
          }),
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.updated).toBe(1);
      });

      // 10 user kill stats
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(10);

      // 10 member participations
      const npcKills = await prisma.npcKillStats.findMany();
      expect(npcKills).toHaveLength(10);

      // But only 1 unique guild kill
      const guildSummary = await prisma.guildKillSummary.findMany();
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(1);
    });
  });

  describe("POST /kills - Multi-character spam from same user", () => {
    it("should deduplicate kills from same user with different characters", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Test Member",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      // Same user with 3 different character configs (multi-client scenario)
      await Promise.all([
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "11111",
            characterId: "char1",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "11111",
            characterId: "char2",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "11111",
            characterId: "char3",
            catchingGuildIds: [guild.id],
          },
        }),
      ]);

      const basePayload = createTestKillPayload();

      // Same user sends kills from 3 different characters
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send({ ...basePayload, characterId: "char1" }),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send({ ...basePayload, characterId: "char2" }),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send({ ...basePayload, characterId: "char3" }),
      ]);

      // All return 201
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Only first should have updated, rest deduplicated
      const successfulUpdates = responses.filter(
        (r) => r.body.updated > 0 && !r.body.deduplicated,
      );
      expect(successfulUpdates).toHaveLength(1);

      const deduplicatedResponses = responses.filter(
        (r) => r.body.deduplicated === true,
      );
      expect(deduplicatedResponses).toHaveLength(2);

      // Only 1 UserKillStats record
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(1);
      expect(userKills[0].totalKills).toBe(1);

      // Only 1 member participation
      const npcKills = await prisma.npcKillStats.findMany();
      expect(npcKills).toHaveLength(1);
      expect(npcKills[0].memberKills).toBe(1);

      // Only 1 unique guild kill
      const guildSummary = await prisma.guildKillSummary.findMany();
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(1);
    });
  });

  describe("POST /kills - Multiple Guilds", () => {
    it("should record participations in all configured guilds", async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_2,
      });
      const role1 = await createKillRole(prisma, guild1.id, "role-1");
      const role2 = await createKillRole(prisma, guild2.id, "role-2");

      // User is member of both guilds
      await createKillMember(prisma, {
        guildId: guild1.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Member in Guild 1",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role1.id,
      });

      await createKillMember(prisma, {
        guildId: guild2.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Member in Guild 2",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role2.id,
      });

      // Configure to report to both guilds
      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild1.id, guild2.id],
        },
      });

      const response = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createTestKillPayload())
        .expect(201);

      expect(response.body.updated).toBe(2);

      // 1 user kill
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(1);

      // 2 member participations (one per guild)
      const npcKills = await prisma.npcKillStats.findMany();
      expect(npcKills).toHaveLength(2);

      // 2 unique guild kills (one per guild)
      const guildSummary = await prisma.guildKillSummary.findMany();
      expect(guildSummary).toHaveLength(2);
      expect(
        guildSummary.find((s) => s.guildId === guild1.id)?.uniqueKills,
      ).toBe(1);
      expect(
        guildSummary.find((s) => s.guildId === guild2.id)?.uniqueKills,
      ).toBe(1);
    });
  });

  describe("GET /guilds/:guildId/stats/kills - Verify Stats", () => {
    it("should return correct stats after concurrent kills from multiple members", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_WRITE,
            Permission.LOOTLOG_LOOTS_HEROES_READ,
          ],
        },
      });

      // Create 3 members
      await Promise.all([
        prisma.member.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            guildId: guild.id,
            name: "Member 1",
            globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
            roles: { connect: { id: role.id } },
          },
        }),
        createKillMember(prisma, {
          guildId: guild.id,
          discordId: TEST_USERS_EXTENDED.MEMBER_2.discordId,
          name: "Member 2",
          globalUserId: TEST_USERS_EXTENDED.MEMBER_2.id,
          roleId: role.id,
        }),
        createKillMember(prisma, {
          guildId: guild.id,
          discordId: TEST_USERS_EXTENDED.MEMBER_3.discordId,
          name: "Member 3",
          globalUserId: TEST_USERS_EXTENDED.MEMBER_3.id,
          roleId: role.id,
        }),
      ]);

      // Configure all to report to guild
      await Promise.all([
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "11111",
            characterId: "1",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS_EXTENDED.MEMBER_2.discordId,
            accountId: "22222",
            characterId: "2",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS_EXTENDED.MEMBER_3.discordId,
            accountId: "33333",
            characterId: "3",
            catchingGuildIds: [guild.id],
          },
        }),
      ]);

      // All 3 kill the same NPC
      const killPayload = createTestKillPayload();
      await Promise.all([
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send({ ...killPayload, accountId: "11111", characterId: "1" }),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS_EXTENDED.MEMBER_2.discordId)
          .set("x-auth-user-id", TEST_USERS_EXTENDED.MEMBER_2.id)
          .send({ ...killPayload, accountId: "22222", characterId: "2" }),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS_EXTENDED.MEMBER_3.discordId)
          .set("x-auth-user-id", TEST_USERS_EXTENDED.MEMBER_3.id)
          .send({ ...killPayload, accountId: "33333", characterId: "3" }),
      ]);

      // Now check stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/guilds/${guild.id}/stats/kills`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      // 1 unique guild kill
      expect(statsResponse.body.overview.guildUniqueKills).toBe(1);

      // 3 total member participations
      expect(statsResponse.body.overview.totalMemberParticipations).toBe(3);

      // 3 members in ranking
      expect(statsResponse.body.memberRanking).toHaveLength(3);

      // Each member has 1 participation
      statsResponse.body.memberRanking.forEach(
        (member: { totalParticipations: number }) => {
          expect(member.totalParticipations).toBe(1);
        },
      );
    });
  });

  describe("POST /kills - COLOSSUS Stable ID Aggregation", () => {
    function createColossusKillPayload(
      spawnId: number,
      name = "Wielki Kolos",
      overrides = {},
    ) {
      return {
        world: "pandora",
        npc: {
          id: spawnId,
          name,
          lvl: 350,
          prof: "w",
          wt: 95, // COLOSSUS type (wt > 89)
          icon: "colossus.gif",
        },
        characterId: "67890",
        accountId: "11111",
        ...overrides,
      };
    }

    it("should aggregate kills for same COLOSSUS name with different spawn IDs", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Test Member",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      // Kill COLOSSUS with spawn ID 111111
      const response1 = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createColossusKillPayload(111111, "Wielki Kolos"))
        .expect(201);

      expect(response1.body.updated).toBe(1);

      // Clear dedup window to allow second kill
      await redis.deleteByPattern("kill:dedup:*");

      // Kill same COLOSSUS with different spawn ID 222222
      const response2 = await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createColossusKillPayload(222222, "Wielki Kolos"))
        .expect(201);

      expect(response2.body.updated).toBe(1);

      // Verify only 1 record with 2 kills (aggregated under stable ID)
      const userKills = await prisma.userKillStats.findMany({
        where: { userId: TEST_USERS.MEMBER_WITH_WRITE.discordId },
      });
      expect(userKills).toHaveLength(1);
      expect(userKills[0].totalKills).toBe(2);
      expect(userKills[0].npcId).toBeLessThan(0); // Stable negative ID
      expect(userKills[0].npcType).toBe(NpcType.COLOSSUS);

      // Verify NpcKillStats also aggregated
      const npcKills = await prisma.npcKillStats.findMany({
        where: { guildId: guild.id },
      });
      expect(npcKills).toHaveLength(1);
      expect(npcKills[0].memberKills).toBe(2);
      expect(npcKills[0].npcId).toBeLessThan(0);

      // Verify GuildKillSummary aggregated
      const guildSummary = await prisma.guildKillSummary.findMany({
        where: { guildId: guild.id },
      });
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(2);
      expect(guildSummary[0].npcId).toBeLessThan(0);
    });

    it("should create separate records for different COLOSSUS names", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      await createKillMember(prisma, {
        guildId: guild.id,
        discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
        name: "Test Member",
        globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
        roleId: role.id,
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      // Kill 'Kolos Ognia'
      await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createColossusKillPayload(111111, "Kolos Ognia"))
        .expect(201);

      await redis.deleteByPattern("kill:dedup:*");

      // Kill 'Kolos Lodu'
      await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createColossusKillPayload(222222, "Kolos Lodu"))
        .expect(201);

      // Verify 2 separate records with different stable IDs
      const userKills = await prisma.userKillStats.findMany({
        where: { userId: TEST_USERS.MEMBER_WITH_WRITE.discordId },
        orderBy: { npcName: "asc" },
      });
      expect(userKills).toHaveLength(2);
      expect(userKills[0].npcId).not.toBe(userKills[1].npcId);
      expect(userKills[0].npcId).toBeLessThan(0);
      expect(userKills[1].npcId).toBeLessThan(0);
      expect(userKills[0].npcType).toBe(NpcType.COLOSSUS);
      expect(userKills[1].npcType).toBe(NpcType.COLOSSUS);
    });

    it("should return negative npcId in top-npcs stats response", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_WRITE,
          ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: { connect: { id: role.id } },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      // Create COLOSSUS kill
      await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createColossusKillPayload(111111, "Wielki Kolos"))
        .expect(201);

      // Query top NPCs filtered by COLOSSUS type
      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild.id}/stats/kills/top-npcs?npcType=COLOSSUS`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body.topNpcs).toHaveLength(1);
      expect(response.body.topNpcs[0].npcId).toBeLessThan(0);
      expect(response.body.topNpcs[0].npcType).toBe("COLOSSUS");
      expect(response.body.topNpcs[0].npcName).toBe("Wielki Kolos");
    });

    it("should accept negative npcId in getNpcKillers endpoint", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: "role-1",
          guildId: guild.id,
          name: "Member",
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_WRITE,
          ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild.id,
          name: "Test Member",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: { connect: { id: role.id } },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: "11111",
          characterId: "67890",
          catchingGuildIds: [guild.id],
        },
      });

      // Create COLOSSUS kill
      await request(app.getHttpServer())
        .post("/kills")
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(createColossusKillPayload(111111, "Wielki Kolos"))
        .expect(201);

      // Get the stable negative ID from the database
      const userKills = await prisma.userKillStats.findFirst({
        where: { npcType: NpcType.COLOSSUS },
      });
      const negativeNpcId = userKills!.npcId;

      expect(negativeNpcId).toBeLessThan(0);

      // Query killers endpoint with negative npcId
      const response = await request(app.getHttpServer())
        .get(`/guilds/${guild.id}/stats/kills/npcs/${negativeNpcId}/killers`)
        .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
        .expect(200);

      expect(response.body.npc).toBeDefined();
      expect(response.body.npc.npcId).toBe(negativeNpcId);
      expect(response.body.npc.npcType).toBe("COLOSSUS");
      expect(response.body.killers).toHaveLength(1);
      expect(response.body.killers[0].memberName).toBe("Test Member");
    });

    it("should handle concurrent kills of same COLOSSUS from different spawn IDs", async () => {
      const guild = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });
      const role = await createKillRole(prisma, guild.id, "role-1");

      // Create 3 members
      await Promise.all([
        createKillMember(prisma, {
          guildId: guild.id,
          discordId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          name: "Member 1",
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roleId: role.id,
        }),
        createKillMember(prisma, {
          guildId: guild.id,
          discordId: TEST_USERS_EXTENDED.MEMBER_2.discordId,
          name: "Member 2",
          globalUserId: TEST_USERS_EXTENDED.MEMBER_2.id,
          roleId: role.id,
        }),
        createKillMember(prisma, {
          guildId: guild.id,
          discordId: TEST_USERS_EXTENDED.MEMBER_3.discordId,
          name: "Member 3",
          globalUserId: TEST_USERS_EXTENDED.MEMBER_3.id,
          roleId: role.id,
        }),
      ]);

      // Configure all members
      await Promise.all([
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
            accountId: "11111",
            characterId: "1",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS_EXTENDED.MEMBER_2.discordId,
            accountId: "22222",
            characterId: "2",
            catchingGuildIds: [guild.id],
          },
        }),
        prisma.userCharactersLootlogSettings.create({
          data: {
            userId: TEST_USERS_EXTENDED.MEMBER_3.discordId,
            accountId: "33333",
            characterId: "3",
            catchingGuildIds: [guild.id],
          },
        }),
      ]);

      // All 3 members kill the "same" COLOSSUS simultaneously
      // Each member reports with a DIFFERENT spawn ID (as would happen in-game)
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
          .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
          .send(
            createColossusKillPayload(111111, "Wielki Kolos", {
              accountId: "11111",
              characterId: "1",
            }),
          ),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS_EXTENDED.MEMBER_2.discordId)
          .set("x-auth-user-id", TEST_USERS_EXTENDED.MEMBER_2.id)
          .send(
            createColossusKillPayload(222222, "Wielki Kolos", {
              accountId: "22222",
              characterId: "2",
            }),
          ),
        request(app.getHttpServer())
          .post("/kills")
          .set("x-auth-discord-id", TEST_USERS_EXTENDED.MEMBER_3.discordId)
          .set("x-auth-user-id", TEST_USERS_EXTENDED.MEMBER_3.id)
          .send(
            createColossusKillPayload(333333, "Wielki Kolos", {
              accountId: "33333",
              characterId: "3",
            }),
          ),
      ]);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.updated).toBe(1);
      });

      // Verify all 3 users have their own UserKillStats (per-user tracking)
      const userKills = await prisma.userKillStats.findMany();
      expect(userKills).toHaveLength(3);

      // All should have same stable negative npcId (derived from name)
      const npcIds = new Set(userKills.map((k) => k.npcId));
      expect(npcIds.size).toBe(1);
      expect(userKills[0].npcId).toBeLessThan(0);

      // 3 member participations in NpcKillStats (same npcId)
      const npcKills = await prisma.npcKillStats.findMany({
        where: { guildId: guild.id },
      });
      expect(npcKills).toHaveLength(3);
      const npcKillIds = new Set(npcKills.map((k) => k.npcId));
      expect(npcKillIds.size).toBe(1);

      // But only 1 unique guild kill (deduplication worked)
      const guildSummary = await prisma.guildKillSummary.findMany({
        where: { guildId: guild.id },
      });
      expect(guildSummary).toHaveLength(1);
      expect(guildSummary[0].uniqueKills).toBe(1);
      expect(guildSummary[0].npcId).toBeLessThan(0);
    });
  });
});
