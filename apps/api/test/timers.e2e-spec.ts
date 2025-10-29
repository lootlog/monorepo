import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/db/prisma.service';
import {
  createTestTimerPayload,
  TEST_GUILDS,
  TEST_USERS,
} from './test-helpers';
import { createTestingModuleWithMocks } from './test-module-helpers';
import { Permission } from 'generated/client';

describe('Timers E2E Tests (Whitelist)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
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
    await prisma.$executeRaw`TRUNCATE TABLE "Guild", "Role", "Member", "Timer", "UserCharactersLootlogSettings" CASCADE`;
  });

  describe('POST /timers', () => {
    it('should create timer for guilds in whitelist', async () => {
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
          addTimersWhitelistGuildIds: [guild1.id],
        },
      });

      const timerPayload = createTestTimerPayload();

      const response = await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].guildId).toBe(guild1.id);
      expect(response.body[0].world).toBe('test-world');
      expect(response.body[0].npcId).toBe(1);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(1);
      expect(timers[0].guildId).toBe(guild1.id);
    });

    it('should not create timer for guilds not in whitelist', async () => {
      const guild1 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_1,
      });

      const guild2 = await prisma.guild.create({
        data: TEST_GUILDS.GUILD_2,
      });

      const role1 = await prisma.role.create({
        data: {
          id: 'role-1',
          guildId: guild1.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      const role2 = await prisma.role.create({
        data: {
          id: 'role-2',
          guildId: guild2.id,
          name: 'Member',
          permissions: [Permission.LOOTLOG_WRITE],
        },
      });

      await prisma.member.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          guildId: guild1.id,
          name: 'Test Member 1',
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
          name: 'Test Member 2',
          globalUserId: TEST_USERS.MEMBER_WITH_WRITE.id,
          roles: {
            connect: { id: role2.id },
          },
        },
      });

      await prisma.userCharactersLootlogSettings.create({
        data: {
          userId: TEST_USERS.MEMBER_WITH_WRITE.discordId,
          accountId: '12345',
          characterId: '1',
          collectLootWhitelistGuildIds: [],
          addTimersWhitelistGuildIds: [guild1.id],
        },
      });

      const timerPayload = createTestTimerPayload();

      const response = await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].guildId).toBe(guild1.id);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(1);
      expect(timers[0].guildId).toBe(guild1.id);
    });

    it('should not create any timer when whitelist is empty', async () => {
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

      const timerPayload = createTestTimerPayload();

      const response = await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body).toHaveLength(0);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(0);
    });

    it('should not create timer when no whitelist config exists', async () => {
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

      const timerPayload = createTestTimerPayload();

      const response = await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body).toHaveLength(0);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(0);
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

      const timerPayload = createTestTimerPayload();

      await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITHOUT_ACCESS.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITHOUT_ACCESS.id)
        .send(timerPayload)
        .expect(403);
    });

    it('should reject timer with too low wt', async () => {
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
          addTimersWhitelistGuildIds: [guild1.id],
        },
      });

      const timerPayload = createTestTimerPayload({
        npc: {
          id: 1,
          name: 'Weak Monster',
          location: 'Weak Lair',
          lvl: 10,
          prof: 'war',
          wt: 10,
          hpp: 1000,
          icon: 'weak.png',
          type: 1,
        },
      });

      await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(400);
    });

    it('should update existing timer with new spawn times', async () => {
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

      const member = await prisma.member.create({
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
          addTimersWhitelistGuildIds: [guild1.id],
        },
      });

      const now = new Date();
      await prisma.timer.create({
        data: {
          guildId: guild1.id,
          world: 'test-world',
          npcId: 1,
          createdById: member.id,
          minSpawnTime: now,
          maxSpawnTime: new Date(now.getTime() + 4000 * 1000),
          latestRespBaseSeconds: 3600,
          latestRespawnRandomness: 400,
          npc: {
            id: 1,
            name: 'Boss Monster',
            location: 'Boss Lair',
            wt: 20,
            prof: 'Warrior',
          },
        },
      });

      const timerPayload = createTestTimerPayload({
        respBaseSeconds: 7200,
      });

      const response = await request(app.getHttpServer())
        .post('/timers')
        .set('x-auth-discord-id', TEST_USERS.MEMBER_WITH_WRITE.discordId)
        .set('x-auth-user-id', TEST_USERS.MEMBER_WITH_WRITE.id)
        .send(timerPayload)
        .expect(201);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].latestRespBaseSeconds).toBe(7200);

      const timers = await prisma.timer.findMany();
      expect(timers).toHaveLength(1);
      expect(timers[0].latestRespBaseSeconds).toBe(7200);
    });
  });
});
