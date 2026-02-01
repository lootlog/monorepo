import { Test, type TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { KillsService } from './kills.service';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { Permission, NpcType, type Role } from 'generated/client';
import type { CreateKillDto } from './dto/create-kill.dto';
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from './dto/get-kill-stats.dto';

describe('KillsService', () => {
  let service: KillsService;
  let prismaService: {
    userKillStats: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    npcKillStats: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    guildKillSummary: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    member: {
      findUnique: jest.Mock;
    };
  };
  let redisService: {
    setNX: jest.Mock;
  };
  let userLootlogConfigService: {
    getLootlogCharacterConfig: jest.Mock;
  };
  let logger: {
    log: jest.Mock;
    error: jest.Mock;
  };

  const mockCreateKillDto: CreateKillDto = {
    world: 'pandora',
    npc: {
      id: -12345,
      name: 'Test Boss',
      lvl: 300,
      prof: 'w',
      wt: 85,
      icon: 'boss.gif',
    },
    characterId: '67890',
    accountId: '11111',
  };

  const createMockRole = (overrides: Partial<Role> = {}): Role => ({
    id: 'role1',
    name: 'Test Role',
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_LOOTS_READ],
    lvlRangeFrom: 0,
    lvlRangeTo: 500,
    guildId: 'guild1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockPrismaService = {
      userKillStats: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      npcKillStats: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      guildKillSummary: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      member: {
        findUnique: jest.fn(),
      },
    };

    const mockRedisService = {
      setNX: jest.fn().mockResolvedValue(true),
    };

    const mockUserLootlogConfigService = {
      getLootlogCharacterConfig: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KillsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<KillsService>(KillsService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    userLootlogConfigService = module.get(UserLootlogConfigService);
    logger = module.get(WINSTON_MODULE_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createKill', () => {
    const discordId = 'discord123';

    it('should always save to UserKillStats when not deduplicated', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.userKillStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_world_npcId: {
            userId: discordId,
            world: 'pandora',
            npcId: 12345,
          },
        },
        create: expect.objectContaining({
          userId: discordId,
          world: 'pandora',
          npcId: 12345,
          npcName: 'Test Boss',
          npcType: NpcType.HERO,
          totalKills: 1,
        }),
        update: expect.objectContaining({
          totalKills: { increment: 1 },
        }),
      });
    });

    it('should return deduplicated: true when user already reported this kill', async () => {
      redisService.setNX.mockResolvedValue(false);
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(result).toEqual({ deduplicated: true, updated: 0 });
      expect(prismaService.userKillStats.upsert).not.toHaveBeenCalled();
    });

    it('should return updated: 0 when no guilds are configured', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(result).toEqual({ updated: 0 });
      expect(prismaService.npcKillStats.upsert).not.toHaveBeenCalled();
    });

    it('should save to NpcKillStats and GuildKillSummary for each configured guild', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1', 'guild2'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      prismaService.npcKillStats.upsert.mockResolvedValue({});
      prismaService.guildKillSummary.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.member.findUnique).toHaveBeenCalledTimes(2);
      expect(prismaService.npcKillStats.upsert).toHaveBeenCalledTimes(2);
      expect(prismaService.guildKillSummary.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ updated: 2 });
    });

    it('should skip guilds where member is not found', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1', 'guild2'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      prismaService.npcKillStats.upsert.mockResolvedValue({});
      prismaService.guildKillSummary.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.npcKillStats.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: 1 });
    });

    it('should deduplicate guilds from loot and timer whitelists', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1', 'guild2'],
        addTimersWhitelistGuildIds: ['guild1', 'guild3'],
      });
      prismaService.member.findUnique.mockResolvedValue({ id: 1 });
      prismaService.npcKillStats.upsert.mockResolvedValue({});
      prismaService.guildKillSummary.upsert.mockResolvedValue({});

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.member.findUnique).toHaveBeenCalledTimes(3);
    });

    it('should handle UserKillStats upsert errors gracefully', async () => {
      prismaService.userKillStats.upsert.mockRejectedValue(
        new Error('DB error'),
      );
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ updated: 0 });
    });

    it('should handle NpcKillStats upsert errors gracefully', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique.mockResolvedValue({ id: 1 });
      prismaService.npcKillStats.upsert.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ updated: 0 });
    });

    it('should convert negative NPC ID to positive', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.userKillStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_world_npcId: expect.objectContaining({
              npcId: 12345,
            }),
          }),
        }),
      );
    });

    it('should not increment GuildKillSummary if guild already reported this kill', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique.mockResolvedValue({ id: 1 });
      prismaService.npcKillStats.upsert.mockResolvedValue({});
      // First setNX call (user dedup) returns true, second (guild dedup) returns false
      redisService.setNX
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.npcKillStats.upsert).toHaveBeenCalledTimes(1);
      expect(prismaService.guildKillSummary.upsert).not.toHaveBeenCalled();
    });

    describe('COLOSSUS stable ID handling', () => {
      const colossusKillDto: CreateKillDto = {
        world: 'pandora',
        npc: {
          id: 999999,
          name: 'Wielki Kolos',
          lvl: 350,
          prof: 'w',
          wt: 95, // COLOSSUS type (wt > 89)
          icon: 'colossus.gif',
        },
        characterId: '67890',
        accountId: '11111',
      };

      it('should use a stable negative ID for COLOSSUS NPCs', async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        await service.createKill(discordId, colossusKillDto);

        const upsertCall = prismaService.userKillStats.upsert.mock.calls[0][0];
        expect(upsertCall.where.userId_world_npcId.npcId).toBeLessThan(0);
        expect(upsertCall.create.npcId).toBeLessThan(0);
        expect(upsertCall.create.npcType).toBe(NpcType.COLOSSUS);
      });

      it('should use the same stable ID for COLOSSUS with same name but different spawn IDs', async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        // First kill with spawn ID 999999
        await service.createKill(discordId, colossusKillDto);
        const firstNpcId =
          prismaService.userKillStats.upsert.mock.calls[0][0].create.npcId;

        jest.clearAllMocks();
        redisService.setNX.mockResolvedValue(true);

        // Second kill with different spawn ID but same name
        const colossusKillDto2: CreateKillDto = {
          ...colossusKillDto,
          npc: {
            ...colossusKillDto.npc,
            id: 888888, // Different spawn ID
          },
        };

        await service.createKill(discordId, colossusKillDto2);
        const secondNpcId =
          prismaService.userKillStats.upsert.mock.calls[0][0].create.npcId;

        expect(firstNpcId).toBe(secondNpcId);
      });

      it('should use different stable IDs for different COLOSSUS names', async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        await service.createKill(discordId, colossusKillDto);
        const firstNpcId =
          prismaService.userKillStats.upsert.mock.calls[0][0].create.npcId;

        jest.clearAllMocks();
        redisService.setNX.mockResolvedValue(true);

        const colossusKillDto2: CreateKillDto = {
          ...colossusKillDto,
          npc: {
            ...colossusKillDto.npc,
            name: 'Inny Kolos', // Different name
          },
        };

        await service.createKill(discordId, colossusKillDto2);
        const secondNpcId =
          prismaService.userKillStats.upsert.mock.calls[0][0].create.npcId;

        expect(firstNpcId).not.toBe(secondNpcId);
      });

      it('should use stable ID for Redis dedup key with COLOSSUS', async () => {
        userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
          null,
        );

        await service.createKill(discordId, colossusKillDto);

        const setNXCall = redisService.setNX.mock.calls[0];
        const dedupKey = setNXCall[0] as string;

        // The dedup key should contain the stable (negative) ID, not the spawn ID
        expect(dedupKey).toContain(':' + String(dedupKey.split(':').pop()));
        expect(dedupKey).not.toContain(':999999');
      });
    });
  });

  describe('getGuildKillStats', () => {
    const guildId = 'guild123';

    const mockMemberStats = [
      {
        memberId: 1,
        npcType: NpcType.HERO,
        npcLvl: 300,
        memberKills: 50,
        member: { id: 1, name: 'Player1', avatar: null, userId: 'user1' },
      },
      {
        memberId: 1,
        npcType: NpcType.TITAN,
        npcLvl: 400,
        memberKills: 20,
        member: { id: 1, name: 'Player1', avatar: null, userId: 'user1' },
      },
      {
        memberId: 2,
        npcType: NpcType.HERO,
        npcLvl: 250,
        memberKills: 30,
        member: { id: 2, name: 'Player2', avatar: null, userId: 'user2' },
      },
    ];

    const mockGuildSummary = [
      { npcType: NpcType.HERO, uniqueKills: 40 },
      { npcType: NpcType.TITAN, uniqueKills: 15 },
    ];

    it('should return aggregated kill stats', async () => {
      prismaService.npcKillStats.findMany.mockResolvedValue(mockMemberStats);
      prismaService.guildKillSummary.findMany.mockResolvedValue(
        mockGuildSummary,
      );
      const query = new GetGuildKillStatsDto();

      const result = await service.getGuildKillStats(guildId, [], [], query);

      expect(result.overview.guildUniqueKills).toBe(55);
      expect(result.overview.totalMemberParticipations).toBe(100);
      expect(result.overview.killsByType).toEqual({
        [NpcType.HERO]: 40,
        [NpcType.TITAN]: 15,
      });
      expect(result.overview.participationsByType).toEqual({
        [NpcType.HERO]: 80,
        [NpcType.TITAN]: 20,
      });
      expect(result.memberRanking).toHaveLength(2);
      expect(result.memberRanking[0].memberName).toBe('Player1');
      expect(result.memberRanking[0].totalParticipations).toBe(70);
    });

    it('should filter by NPC type when provided', async () => {
      prismaService.npcKillStats.findMany.mockResolvedValue([]);
      prismaService.guildKillSummary.findMany.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.npcType = 'TITAN';

      await service.getGuildKillStats(guildId, [], [], query);

      expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcType: { in: ['TITAN'] },
          }),
        }),
      );
    });

    it('should filter by level range when provided', async () => {
      prismaService.npcKillStats.findMany.mockResolvedValue([]);
      prismaService.guildKillSummary.findMany.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.minLvl = 100;
      query.maxLvl = 300;

      await service.getGuildKillStats(guildId, [], [], query);

      expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcLvl: { gte: 100, lte: 300 },
          }),
        }),
      );
    });

    describe('permission filtering', () => {
      it('should not apply visibility filter for administrative users', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const permissions = [Permission.OWNER];

        await service.getGuildKillStats(guildId, permissions, [], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              OR: expect.anything(),
            }),
          }),
        );
      });

      it('should not apply visibility filter when no roles provided', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();

        await service.getGuildKillStats(guildId, [], [], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              OR: expect.anything(),
            }),
          }),
        );
      });

      it('should filter out TITANs when role lacks TITANS_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcType: { not: NpcType.TITAN } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it('should allow TITANs when role has TITANS_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        const andConditions = call.where.OR?.[0]?.AND || [];
        const hasTitanFilter = andConditions.some(
          (c: any) => c.npcType?.not === NpcType.TITAN,
        );
        expect(hasTitanFilter).toBe(false);
      });

      it('should filter out HEROes when role lacks HEROES_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcType: { notIn: [NpcType.HERO, NpcType.EVENT_HERO] } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it('should allow HEROes when role has HEROES_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_HEROES_READ,
          ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        const andConditions = call.where.OR?.[0]?.AND || [];
        const hasHeroFilter = andConditions.some(
          (c: any) =>
            c.npcType?.notIn?.includes(NpcType.HERO) ||
            c.npcType?.notIn?.includes(NpcType.EVENT_HERO),
        );
        expect(hasHeroFilter).toBe(false);
      });

      it('should apply level range filter from role', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          lvlRangeFrom: 100,
          lvlRangeTo: 300,
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcLvl: { gte: 100 } },
                    { npcLvl: { lte: 300 } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it('should combine visibility from multiple roles with OR', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role1 = createMockRole({
          id: 'role1',
          permissions: [Permission.LOOTLOG_LOOTS_READ],
          lvlRangeFrom: 0,
          lvlRangeTo: 200,
        });
        const role2 = createMockRole({
          id: 'role2',
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
          lvlRangeFrom: 200,
          lvlRangeTo: 500,
        });

        await service.getGuildKillStats(guildId, [], [role1, role2], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(2);
      });

      it('should skip roles without LOOTLOG_LOOTS_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        prismaService.guildKillSummary.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role1 = createMockRole({
          id: 'role1',
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        });
        const role2 = createMockRole({
          id: 'role2',
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, [], [role1, role2], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(1);
      });
    });
  });

  describe('getUserKillStats', () => {
    const discordId = 'discord123';

    const mockUserStats = [
      {
        world: 'pandora',
        npcId: 999,
        npcName: 'Boss1',
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcProf: 'w',
        npcIcon: 'boss.gif',
        totalKills: 50,
      },
      {
        world: 'tempest',
        npcId: 888,
        npcName: 'Boss2',
        npcType: NpcType.TITAN,
        npcLvl: 400,
        npcProf: null,
        npcIcon: 'titan.gif',
        totalKills: 20,
      },
      {
        world: 'pandora',
        npcId: 888,
        npcName: 'Boss2',
        npcType: NpcType.TITAN,
        npcLvl: 400,
        npcProf: null,
        npcIcon: 'titan.gif',
        totalKills: 30,
      },
    ];

    it('should return aggregated user stats', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.overview.totalKills).toBe(100);
      expect(result.overview.killsByType).toEqual({
        [NpcType.HERO]: 50,
        [NpcType.TITAN]: 50,
      });
      expect(result.overview.killsByWorld).toEqual({
        pandora: 80,
        tempest: 20,
      });
    });

    it('should return top NPCs sorted by kill count with world-npc combination', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      // Stats are grouped by world:npcId, so same npc on different worlds are separate entries
      expect(result.topNpcs).toHaveLength(3);
      expect(result.topNpcs[0].npcName).toBe('Boss1');
      expect(result.topNpcs[0].totalKills).toBe(50);
    });

    it('should filter by world when provided', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.world = 'pandora';

      await service.getUserKillStats(discordId, query);

      expect(prismaService.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            world: 'pandora',
          }),
        }),
      );
    });

    it('should filter by NPC types when provided', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.npcType = 'HERO,TITAN';

      await service.getUserKillStats(discordId, query);

      expect(prismaService.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcType: { in: ['HERO', 'TITAN'] },
          }),
        }),
      );
    });

    it('should handle empty stats', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.overview.totalKills).toBe(0);
      expect(result.overview.killsByType).toEqual({});
      expect(result.overview.killsByWorld).toEqual({});
      expect(result.topNpcs).toEqual([]);
    });

    it('should limit topNpcs to specified limit', async () => {
      const manyNpcs = Array.from({ length: 15 }, (_, i) => ({
        world: 'pandora',
        npcId: 1000 + i,
        npcName: `Boss${i}`,
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcProf: null,
        npcIcon: 'boss.gif',
        totalKills: 100 - i,
      }));
      prismaService.userKillStats.findMany.mockResolvedValue(manyNpcs);
      const query = new GetUserKillStatsDto();
      query.topNpcsLimit = 10;

      const result = await service.getUserKillStats(discordId, query);

      expect(result.topNpcs).toHaveLength(10);
      expect(result.topNpcs[0].totalKills).toBe(100);
      expect(result.topNpcs[9].totalKills).toBe(91);
    });
  });
});
