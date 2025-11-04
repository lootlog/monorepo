import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/db/prisma.service';
import { RedisService } from '../src/lib/redis/redis.service';
import { createTestLootPayload, TEST_GUILDS, TEST_USERS } from './test-helpers';
import { createTestingModuleWithMocks } from './test-module-helpers';
import { Permission, NpcType, ItemRarity } from 'generated/client';
import { getLootlogConfigCacheKey } from '../src/shared/constants/cache.constant';

describe('Loots E2E Tests (Guild-Specific Endpoint)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);
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
    const redisClient = await redisService.getClient();
    await redisClient.flushall();
  });

  describe('POST /guilds/:guildId/loots', () => {
    it('should create loot for guild in whitelist', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [guild1.id],
          addTimersWhitelistGuildIds: [],
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
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(1);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(1);
      expect(lootSubmissions[0].guildId).toBe(guild1.id);
    });

    it('should return 403 when guild is not in whitelist', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild2.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild2.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [guild1.id],
          addTimersWhitelistGuildIds: [],
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

      await request(app.getHttpServer())
        .post(`/guilds/${guild2.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(403);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(0);
    });

    it('should return 403 when whitelist is empty', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [],
          addTimersWhitelistGuildIds: [],
        },
      });

      const lootPayload = createTestLootPayload();

      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(403);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(0);
    });

    it('should return 403 when no whitelist config exists', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const lootPayload = createTestLootPayload();

      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(403);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(0);
    });

    it('should return 403 when user has no LOOTLOG_WRITE permission', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_READ],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITHOUT_ACCESS.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const lootPayload = createTestLootPayload();

      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITHOUT_ACCESS.id)
        .send(lootPayload)
        .expect(403);
    });

    it('should return 400 when guild config rejects loot (wrong rarity)', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [guild1.id],
          addTimersWhitelistGuildIds: [],
        },
      });

      await prisma.lootlogConfig.create({
        data: {
          id: guild1.id,
          npcs: {
            create: [
              {
                npcType: NpcType.ELITE2,
                allowedRarities: [ItemRarity.HEROIC],
              },
            ],
          },
        },
      });

      const lootPayload = createTestLootPayload();

      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(400);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(0);
    });

    it('should return 400 when loots array exceeds 10 items', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [guild1.id],
          addTimersWhitelistGuildIds: [],
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

      const lootPayload = createTestLootPayload({
        loots: Array.from({ length: 11 }, (_, i) => ({
          hid: `item-${i}`,
          name: `Item ${i}`,
          icon: 'item.png',
          pr: 100,
          prc: 'unique',
          stat: 'rarity=unique;lvl=50',
          id: i,
          cl: 1,
        })),
      });

      const response = await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload)
        .expect(400);

      expect(response.body.message).toContain(
        'loots must contain no more than 10 elements',
      );
    });

    it('should use cached lootlog config on second request', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [guild1.id],
          addTimersWhitelistGuildIds: [],
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

      const cacheKey = getLootlogConfigCacheKey(guild1.id);
      const cachedBefore = await redisService.get(cacheKey);
      expect(cachedBefore).toBeNull();

      const lootPayload1 = createTestLootPayload({
        loots: [{ ...createTestLootPayload().loots[0], hid: 'item-1' }],
      });
      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload1)
        .expect(201);

      const cachedAfter = await redisService.get(cacheKey);
      expect(cachedAfter).not.toBeNull();
      const cached = JSON.parse(cachedAfter!);
      expect(cached.id).toBe(guild1.id);
      expect(cached.npcs).toHaveLength(1);

      const lootPayload2 = createTestLootPayload({
        loots: [{ ...createTestLootPayload().loots[0], hid: 'item-2' }],
      });
      await request(app.getHttpServer())
        .post(`/guilds/${guild1.id}/loots`)
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(lootPayload2)
        .expect(201);

      const lootSubmissions = await prisma.lootSubmission.findMany();
      expect(lootSubmissions).toHaveLength(2);
    });

    it('should invalidate cache when lootlog config is updated', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const role = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Owner',
          permissions: [Permission.ADMIN],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_GUILDS.GUILD_1.ownerId,
          guildId: guild1.id,
          name: 'Guild Owner',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role.id },
          },
        },
      });

      const lootlogConfig = await prisma.lootlogConfig.create({
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
        include: { npcs: true },
      });

      const cacheKey = getLootlogConfigCacheKey(guild1.id);

      await redisService.set(
        cacheKey,
        JSON.stringify({
          id: guild1.id,
          npcs: [
            { npcType: NpcType.ELITE2, allowedRarities: [ItemRarity.UNIQUE] },
          ],
        }),
        3600,
      );
      const cachedBefore = await redisService.get(cacheKey);
      expect(cachedBefore).not.toBeNull();

      await request(app.getHttpServer())
        .put(`/guilds/${guild1.id}/lootlog-config/${lootlogConfig.npcs[0].id}`)
        .set('x-auth-discord-id', TEST_GUILDS.GUILD_1.ownerId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send({
          allowedRarities: [ItemRarity.HEROIC],
        });

      const cachedAfter = await redisService.get(cacheKey);
      expect(cachedAfter).toBeNull();
    });
  });
});
